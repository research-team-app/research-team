import json
import logging
import os
from array import array
from typing import TYPE_CHECKING

import boto3
from botocore.exceptions import ClientError

if TYPE_CHECKING:
    from mypy_boto3_bedrock_runtime import BedrockRuntimeClient  # type: ignore[import-untyped]
    from mypy_boto3_s3vectors import S3VectorsClient  # type: ignore[import-untyped]

logger = logging.getLogger()

RUN_LOCAL = os.getenv("RUN_LOCAL") == "True"
aws_session = (
    boto3.Session(profile_name="research-team") if RUN_LOCAL else boto3.Session()
)


class VectorUtility:
    """
    utility class to get embeddings, get vectors, put vectors and delete vectors
    """

    BATCH_SIZE = 100

    def __init__(
        self, vector_bucket: str | None = None, vector_index: str | None = None
    ):
        self.bedrock_runtime: BedrockRuntimeClient = aws_session.client(
            service_name="bedrock-runtime"
        )
        self.s3vectors: S3VectorsClient = aws_session.client(service_name="s3vectors")
        self.vector_bucket = vector_bucket
        self.vector_index = vector_index

    @staticmethod
    def chunk_list(data: list, batchsize: int):
        """Yield successive n-sized from data list"""
        for i in range(0, len(data), batchsize):
            yield data[i : i + batchsize]

    @staticmethod
    def _to_float32(vec: list[float]) -> list[float]:
        return list(array("f", vec))

    def get_embeddings(self, texts: list[str], is_query=False):
        """Bulk Embedding for Cohere v4 on Bedrock"""
        all_vectors = []
        model_id = "cohere.embed-v4:0"

        for chunk in VectorUtility.chunk_list(texts, batchsize=50):
            # Sanitize: Remove empty strings which cause API errors
            sanitized_chunk = [t for t in chunk if t and str(t).strip()]
            if not sanitized_chunk:
                continue

            body = json.dumps(
                {
                    "texts": sanitized_chunk,
                    "input_type": "search_query" if is_query else "search_document",
                    "embedding_types": ["float"],
                    "output_dimension": 1536,
                }
            )

            try:
                response = self.bedrock_runtime.invoke_model(
                    body=body,
                    modelId=model_id,
                    accept="application/json",
                    contentType="application/json",
                )

                response_body = json.loads(response.get("body").read())

                # Extract safely
                embeddings = response_body.get("embeddings", {}).get("float", [])
                all_vectors.extend(embeddings)

            except ClientError as e:
                logger.error(f"AWS Error: {e.response['Error']['Message']}")
                raise

        return all_vectors

    def get_all_vectors(
        self, vector_bucket: str | None = None, vector_index: str | None = None
    ):
        """return all vector from vector database"""
        all_vectors = []
        next_token = None

        while True:
            params = {
                "vectorBucketName": (
                    vector_bucket if vector_bucket else self.vector_bucket
                ),
                "indexName": vector_index if vector_index else self.vector_index,
                "maxResults": 100,
                "returnData": True,
            }

            if next_token:
                params["nextToken"] = next_token

            response = self.s3vectors.list_vectors(**params)

            # collect all the keys
            for v in response.get("vectors", []):
                all_vectors.append(v)

            next_token = response.get("nextToken")
            if not next_token:
                break
        return all_vectors

    def get_vectors(
        self,
        keys: list[str],
        vector_bucket: str | None = None,
        vector_index: str | None = None,
    ):
        """Retrieves specific vectors."""
        all = []
        for chunk in VectorUtility.chunk_list(keys, VectorUtility.BATCH_SIZE):
            try:
                response = self.s3vectors.get_vectors(
                    vectorBucketName=(
                        vector_bucket if vector_bucket else self.vector_bucket
                    ),
                    indexName=vector_index if vector_index else self.vector_index,
                    keys=chunk,
                    returnData=True,
                    returnMetadata=True,
                )
                all.extend(response.get("vectors", []))
            except ClientError as e:
                logger.error(f"AWS Error in get_vectors: {e}")
                raise
            except Exception as e:
                logger.error(f"General error in get_vectors: {e}")
                raise
        return all

    def delete_vectors(
        self,
        keys: list[str],
        vector_bucket: str | None = None,
        vector_index: str | None = None,
    ):
        """Delete vectors by keys"""
        for chunk in VectorUtility.chunk_list(keys, VectorUtility.BATCH_SIZE):
            try:
                response = self.s3vectors.delete_vectors(
                    vectorBucketName=(
                        vector_bucket if vector_bucket else self.vector_bucket
                    ),
                    indexName=vector_index if vector_index else self.vector_index,
                    keys=chunk,
                )

            except ClientError as e:
                error_code = e.response["Error"]["Code"]
                logger.error(f"AWS Error in delete_vectors [{error_code}]: {e}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error in delete_vectors: {e}")
                raise
        return response

    def put_vectors(
        self,
        data: list[dict],
        vector_bucket: str | None = None,
        vector_index: str | None = None,
    ):
        responses = []
        for chunk in VectorUtility.chunk_list(data, VectorUtility.BATCH_SIZE):
            try:
                texts = [item["text"] for item in chunk]
                keys = [item["key"] for item in chunk]

                embeddings = self.get_embeddings(texts)

                if len(texts) != len(embeddings):
                    logger.error(
                        "text length is not equal to embedding length; "
                        "skipping this batch and continuing. "
                        "texts=%s embeddings=%s",
                        len(texts),
                        len(embeddings),
                    )
                    continue

                formatted_vectors = [
                    {
                        "key": key,
                        "data": {"float32": VectorUtility._to_float32(embedding)},
                    }
                    for key, embedding in zip(keys, embeddings)
                ]

                response = self.s3vectors.put_vectors(
                    vectorBucketName=(
                        vector_bucket if vector_bucket else self.vector_bucket
                    ),
                    indexName=vector_index if vector_index else self.vector_index,
                    vectors=formatted_vectors,
                )
                responses.append(response)
                logger.info(f"Successfully uploaded batch of {len(chunk)} vectors.")

            except ClientError as e:
                error_code = e.response["Error"]["Code"]
                logger.error(f"AWS Error in put_vectors [{error_code}]: {e}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error in put_vectors: {e}")
                raise
        return responses

    def query_vectors(
        self,
        keyword: str,
        topK: int = 25,
        vector_bucket: str | None = None,
        vector_index: str | None = None,
    ):
        # Use search_query so the embedding matches Cohere's query-vs-document semantics
        keyword_clean = (keyword or "").strip()
        if not keyword_clean:
            return []
        embedding_vector = self.get_embeddings([keyword_clean], is_query=True)[0]

        response = self.s3vectors.query_vectors(
            vectorBucketName=vector_bucket if vector_bucket else self.vector_bucket,
            indexName=vector_index if vector_index else self.vector_index,
            topK=topK,
            queryVector={"float32": VectorUtility._to_float32(embedding_vector)},
        )

        return response.get("vectors", [])

    def query_vectors_with_vector(
        self,
        vector,
        topK: int = 25,
        vector_bucket: str | None = None,
        vector_index: str | None = None,
    ):
        response = self.s3vectors.query_vectors(
            vectorBucketName=vector_bucket if vector_bucket else self.vector_bucket,
            indexName=vector_index if vector_index else self.vector_index,
            topK=topK,
            queryVector={"float32": VectorUtility._to_float32(vector)},
        )

        return response.get("vectors", [])

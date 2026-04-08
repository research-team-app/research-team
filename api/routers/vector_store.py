from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from services.vector_utility import VectorUtility

vector_store_router = APIRouter()

load_dotenv()

vector_utility: VectorUtility = VectorUtility()


class EmbeddingModel(BaseModel):
    text: list[str]


class BaseVectorModel(BaseModel):
    vector_bucket: str
    index_name: str


class VectorModel(BaseVectorModel):
    keys: list[str]


class PutVectorModal(BaseVectorModel):
    data: list[dict]


@vector_store_router.post("/embedding")
async def get_embedding(embeddingModel: EmbeddingModel):
    """Pass list of text and get embedding back"""
    try:
        embeddings = vector_utility.get_embeddings(embeddingModel.text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding generation failed: {str(e)}",
        )
    return {"embeddings": embeddings}


@vector_store_router.post("/all-vectors")
async def get_all_vectors(model: BaseVectorModel):
    """return all the vectors from given vector bucket and index"""
    try:
        vectors = vector_utility.get_all_vectors(
            vector_bucket=model.vector_bucket, vector_index=model.index_name
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Getting all vectors failed: {str(e)}",
        )
    return vectors


@vector_store_router.post("/vectors")
async def get_vectors(model: VectorModel):
    """return vectors with specific keys"""
    try:
        vectors = vector_utility.get_vectors(
            vector_bucket=model.vector_bucket,
            vector_index=model.index_name,
            keys=model.keys,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Getting vectors failed: {str(e)}",
        )
    return vectors


@vector_store_router.delete("/vectors")
async def delete_vectors(model: VectorModel):
    """delete vectors by keys"""
    try:
        response = vector_utility.delete_vectors(
            vector_bucket=model.vector_bucket,
            vector_index=model.index_name,
            keys=model.keys,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deleting vectors failed: {str(e)}",
        )
    return response


@vector_store_router.put("/vectors")
def put_vectors(model: PutVectorModal):
    """put vectors in vector store. If the key exist,, it will override it"""
    try:
        response = vector_utility.put_vectors(
            vector_bucket=model.vector_bucket,
            vector_index=model.index_name,
            data=model.data,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector Put failed: {str(e)}",
        )
    return response

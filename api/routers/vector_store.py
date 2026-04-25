from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth import get_verified_user_or_internal, require_admin_access
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
async def get_embedding(
    embeddingModel: EmbeddingModel,
    _auth: dict = Depends(get_verified_user_or_internal),
):
    """Pass list of text and get embedding back. Authenticated callers only."""
    try:
        embeddings = vector_utility.get_embeddings(embeddingModel.text)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Embedding generation failed.",
        )
    return {"embeddings": embeddings}


@vector_store_router.post("/all-vectors")
async def get_all_vectors(
    model: BaseVectorModel,
    _auth: dict = Depends(require_admin_access),
):
    """Return all the vectors from given vector bucket and index. Admin/internal only."""
    try:
        vectors = vector_utility.get_all_vectors(
            vector_bucket=model.vector_bucket, vector_index=model.index_name
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Getting all vectors failed.",
        )
    return vectors


@vector_store_router.post("/vectors")
async def get_vectors(
    model: VectorModel,
    _auth: dict = Depends(require_admin_access),
):
    """Return vectors with specific keys. Admin/internal only."""
    try:
        vectors = vector_utility.get_vectors(
            vector_bucket=model.vector_bucket,
            vector_index=model.index_name,
            keys=model.keys,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Getting vectors failed.",
        )
    return vectors


@vector_store_router.delete("/vectors")
async def delete_vectors(
    model: VectorModel,
    _auth: dict = Depends(require_admin_access),
):
    """Delete vectors by keys. Admin/internal only — destructive."""
    try:
        response = vector_utility.delete_vectors(
            vector_bucket=model.vector_bucket,
            vector_index=model.index_name,
            keys=model.keys,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Deleting vectors failed.",
        )
    return response


@vector_store_router.put("/vectors")
def put_vectors(
    model: PutVectorModal,
    _auth: dict = Depends(require_admin_access),
):
    """Put vectors in vector store. If the key exists, it will override. Admin/internal only."""
    try:
        response = vector_utility.put_vectors(
            vector_bucket=model.vector_bucket,
            vector_index=model.index_name,
            data=model.data,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vector Put failed.",
        )
    return response

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth import require_self_user_id

profile_router = APIRouter(prefix="/profile_picture")

AWS_REGION = "us-east-1"
S3_BUCKET_NAME = "rt-profile-pictures"
PRESIGNED_PUT_TTL_SECONDS = 60 * 60
PRESIGNED_GET_TTL_SECONDS = 60 * 60

s3 = boto3.client("s3", region_name=AWS_REGION)


class PresignedPutRequest(BaseModel):
    content_type: str
    file_name: str | None = None  # optional


def _ext_from_content_type(ct: str) -> str:
    # Minimal mapping; default to jpeg
    if ct == "image/png":
        return "png"
    if ct == "image/webp":
        return "webp"
    # Treat anything else image/* as jpeg
    return "jpeg"


@profile_router.post(
    "/{user_id}/presigned_put",
    summary="Create presigned PUT for direct upload",
    description="Returns a short-lived presigned PUT URL and a presigned GET URL for preview. Owner only.",
)
def create_presigned_put(
    user_id: str, req: PresignedPutRequest, _: str = Depends(require_self_user_id)
):
    if not req.content_type or not req.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image content types are allowed",
        )
    ext = _ext_from_content_type(req.content_type)
    key = f"{user_id}.{ext}"

    # Generate a presigned PUT URL (client must include the same Content-Type header)
    try:
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": S3_BUCKET_NAME,
                "Key": key,
                "ContentType": req.content_type,
            },
            ExpiresIn=PRESIGNED_PUT_TTL_SECONDS,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create presigned PUT URL: {e}",
        )

    # Also hand back a presigned GET URL for immediate preview
    try:
        preview_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET_NAME, "Key": key},
            ExpiresIn=PRESIGNED_GET_TTL_SECONDS,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create presigned GET URL: {e}",
        )

    return {
        "upload_url": upload_url,
        "object_key": key,
        "preview_url": preview_url,
        "expires_in_seconds": PRESIGNED_PUT_TTL_SECONDS,
    }


@profile_router.get(
    "/{user_id}",
    summary="Get user's profile picture (presigned GET URL)",
    description="Returns JSON containing a short-lived presigned URL to view the user's profile picture. If not uploaded yet, returns presigned_url as null.",
)
def get_profile_picture(user_id: str):
    # Try common extensions in case type changed
    possible_keys = [
        f"{user_id}.jpeg",
        f"{user_id}.jpg",
        f"{user_id}.png",
        f"{user_id}.webp",
    ]

    found_key = None
    for key in possible_keys:
        try:
            s3.head_object(Bucket=S3_BUCKET_NAME, Key=key)
            found_key = key
            break
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code in ("404", "NoSuchKey", "NotFound"):
                continue
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error accessing storage",
            )

    if not found_key:
        return {"presigned_url": None}

    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET_NAME, "Key": found_key},
            ExpiresIn=PRESIGNED_GET_TTL_SECONDS,
        )
        return {"presigned_url": url}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create presigned URL",
        )

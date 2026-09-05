from fastapi import Header, HTTPException, status, Depends
from typing import Optional

def get_current_user(
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    authorization: Optional[str] = Header(None)
) -> dict:
    role = "editor"  # Default fallback role
    username = x_user_name or "Content Editor"

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        if token in ["admin", "editor"]:
            role = token
            username = f"{token.capitalize()} User"

    if x_user_role:
        clean_role = x_user_role.lower().strip()
        if clean_role in ["admin", "editor"]:
            role = clean_role
            username = f"{clean_role.capitalize()} User"

    return {"role": role, "username": username}

def require_role(required_role: str):
    def role_checker(user: dict = Depends(get_current_user)):
        role_hierarchy = {"editor": 1, "admin": 2}
        user_level = role_hierarchy.get(user["role"], 0)
        required_level = role_hierarchy.get(required_role, 2)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Action requires '{required_role}' role, but active role is '{user['role']}'."
            )
        return user
    return role_checker

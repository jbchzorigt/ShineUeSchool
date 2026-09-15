from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStaffOrReadOnly(BasePermission):
    """GET/HEAD/OPTIONS бүгдэд нээлттэй; POST/PUT/PATCH/DELETE зөвхөн staff хэрэглэгчид."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

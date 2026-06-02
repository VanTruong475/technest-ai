from typing import Optional

from sqlmodel import Session, select, func, col

from app.models.blog_post import BlogPost


class BlogRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_all(
        self,
        page: int = 1,
        limit: int = 10,
        category: Optional[str] = None,
        published_only: bool = True,
    ) -> tuple[list[BlogPost], int]:
        offset = (page - 1) * limit
        conditions = []

        if published_only:
            conditions.append(BlogPost.published == True)  # noqa: E712
        if category:
            conditions.append(BlogPost.category == category)

        if conditions:
            from sqlmodel import and_
            count_stmt = select(func.count()).select_from(BlogPost).where(and_(*conditions))
            total = self.session.exec(count_stmt).one()
            stmt = (
                select(BlogPost)
                .where(and_(*conditions))
                .order_by(col(BlogPost.published_at).desc(), col(BlogPost.created_at).desc())
                .offset(offset)
                .limit(limit)
            )
        else:
            count_stmt = select(func.count()).select_from(BlogPost)
            total = self.session.exec(count_stmt).one()
            stmt = (
                select(BlogPost)
                .order_by(col(BlogPost.published_at).desc(), col(BlogPost.created_at).desc())
                .offset(offset)
                .limit(limit)
            )

        items = list(self.session.exec(stmt).all())
        return items, total

    def find_by_id(self, post_id: int) -> Optional[BlogPost]:
        return self.session.exec(select(BlogPost).where(BlogPost.id == post_id)).first()

    def find_by_slug(self, slug: str) -> Optional[BlogPost]:
        return self.session.exec(select(BlogPost).where(BlogPost.slug == slug)).first()

    def create(self, post: BlogPost) -> BlogPost:
        self.session.add(post)
        self.session.commit()
        self.session.refresh(post)
        return post

    def update(self, post: BlogPost) -> BlogPost:
        self.session.add(post)
        self.session.commit()
        self.session.refresh(post)
        return post

    def delete(self, post: BlogPost) -> None:
        self.session.delete(post)
        self.session.commit()

    def get_categories(self) -> list[str]:
        """Get distinct published categories."""
        stmt = (
            select(BlogPost.category)
            .where(BlogPost.published == True, BlogPost.category.is_not(None))  # noqa: E712
            .distinct()
        )
        return list(self.session.exec(stmt).all())

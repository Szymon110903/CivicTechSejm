"""Add file_content to BillDocument

Revision ID: 987aad501cfb
Revises: 8fcda3245909
Create Date: 2026-07-19 22:57:21.863845

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '987aad501cfb'
down_revision: Union[str, Sequence[str], None] = '8fcda3245909'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('bill_documents', sa.Column('file_content', sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('bill_documents', 'file_content')

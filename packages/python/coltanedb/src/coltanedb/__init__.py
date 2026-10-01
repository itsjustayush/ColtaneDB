"""
ColtaneDB Python SDK (`coltanedb`)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Official Python client and query tooling for ColtaneDB and the Colt query language.

Basic usage:

    from coltanedb import ColtaneClient, query

    client = ColtaneClient("http://localhost:3000", api_key="clt_live_...", tenant_id="tnt_...")

    # Execute a Colt query
    res = client.execute("FIND books SELECT title, author LIMIT 10")
    for row in res.rows:
        print(row)
"""

from .client import (
    ColtaneClient,
    Client,
    QueryResult,
    PlanResult,
    ParseResult,
    Diagnostic,
    PlanStep,
    ColtaneError,
    ColtaneAuthError,
    ColtaneConnectionError,
    ColtaneQueryError,
)
from .builder import query, collection, QueryBuilder, CollectionBuilder

__version__ = "0.1.0"
__all__ = [
    "ColtaneClient",
    "Client",
    "QueryResult",
    "PlanResult",
    "ParseResult",
    "Diagnostic",
    "PlanStep",
    "ColtaneError",
    "ColtaneAuthError",
    "ColtaneConnectionError",
    "ColtaneQueryError",
    "query",
    "collection",
    "QueryBuilder",
    "CollectionBuilder",
]

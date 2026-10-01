from __future__ import annotations

import json
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional
from dataclasses import dataclass


@dataclass
class Diagnostic:
    code: str
    message: str
    span: Dict[str, Any]
    hint: Optional[str] = None


@dataclass
class PlanStep:
    backend: str
    operation: str
    parameterized_statement: str
    params: List[Any]
    collection: Optional[str] = None


@dataclass
class PlanResult:
    steps: List[PlanStep]
    diagnostics: List[Diagnostic]
    raw: Dict[str, Any]

    @property
    def is_valid(self) -> bool:
        return len(self.diagnostics) == 0


@dataclass
class ParseResult:
    ast: Dict[str, Any]
    diagnostics: List[Diagnostic]


@dataclass
class QueryResult:
    success: bool
    tenant_id: str
    plan: Dict[str, Any]
    diagnostics: List[Diagnostic]
    results: List[Any]
    rows: List[Any]
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    raw: Dict[str, Any] = None


class ColtaneError(Exception):
    """Base exception for all ColtaneDB client operations."""
    pass


class ColtaneAuthError(ColtaneError):
    """Raised on authentication or permission failure."""
    pass


class ColtaneConnectionError(ColtaneError):
    """Raised when connection to ColtaneDB fails."""
    pass


class ColtaneQueryError(ColtaneError):
    """Raised when query execution fails."""
    pass


class ColtaneClient:
    """Official Python client for ColtaneDB."""

    def __init__(
        self,
        base_url: str = "http://localhost:3000",
        api_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.tenant_id = tenant_id
        self.timeout = timeout

    def _request(
        self,
        method: str,
        path: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "coltanedb-python/0.1.0",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                body = resp.read().decode("utf-8")
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8")
            error_msg = f"HTTP {err.code}: {err.reason}"
            try:
                err_json = json.loads(err_body)
                error_msg = err_json.get("error", err_json.get("errorMessage", error_msg))
            except json.JSONDecodeError:
                if err_body:
                    error_msg = err_body

            if err.code in (401, 403):
                raise ColtaneAuthError(error_msg)
            elif err.code >= 400:
                raise ColtaneQueryError(error_msg)
            raise ColtaneError(error_msg)
        except urllib.error.URLError as err:
            raise ColtaneConnectionError(f"Failed to connect to ColtaneDB at {self.base_url}: {err.reason}")

    def execute(
        self,
        source: str,
        parameters: Optional[Dict[str, Any]] = None,
        tenant_id: Optional[str] = None,
    ) -> QueryResult:
        """Execute a raw .colt query against a project tenant workspace."""
        target_tenant = tenant_id or self.tenant_id
        if not target_tenant:
            # If no tenant ID specified, attempt default-project lookup
            try:
                default_info = self._request("GET", "/api/v1/default-project")
                target_tenant = default_info.get("tenantId")
            except Exception:
                pass

        if not target_tenant:
            raise ColtaneError("tenant_id must be provided to execute queries on ColtaneDB.")

        payload = {
            "source": source,
            "parameters": parameters or {},
        }
        res = self._request("POST", f"/api/v1/projects/{target_tenant}/execute", payload)

        diags = [
            Diagnostic(
                code=d["code"],
                message=d["message"],
                span=d.get("span", {}),
                hint=d.get("hint"),
            )
            for d in res.get("diagnostics", [])
        ]

        results = res.get("results", [])
        rows: List[Any] = []
        for r in results:
            if isinstance(r, list):
                rows.extend(r)
            elif isinstance(r, dict) and "record" in r:
                rows.append(r["record"])
            else:
                rows.append(r)

        return QueryResult(
            success=bool(res.get("success", False)),
            tenant_id=res.get("tenantId", target_tenant),
            plan=res.get("plan", {}),
            diagnostics=diags,
            results=results,
            rows=rows,
            error_code=res.get("errorCode"),
            error_message=res.get("errorMessage"),
            raw=res,
        )

    def plan(self, source: str) -> PlanResult:
        """Compile and plan a Colt script to verify statements and multi-engine targets."""
        res = self._request("POST", "/api/plan", {"source": source})
        diags = [
            Diagnostic(
                code=d["code"],
                message=d["message"],
                span=d.get("span", {}),
                hint=d.get("hint"),
            )
            for d in res.get("diagnostics", [])
        ]
        steps = []
        raw_plan = res.get("plan", {})
        for s in raw_plan.get("steps", []):
            steps.append(
                PlanStep(
                    backend=s.get("backend", "neon"),
                    operation=s.get("operation", "query"),
                    parameterized_statement=s.get("parameterizedStatement", ""),
                    params=s.get("params", []),
                    collection=s.get("collection"),
                )
            )
        return PlanResult(steps=steps, diagnostics=diags, raw=res)

    def parse(self, source: str) -> ParseResult:
        """Parse Colt source code into its Abstract Syntax Tree (AST)."""
        res = self._request("POST", "/api/parse", {"source": source})
        diags = [
            Diagnostic(
                code=d["code"],
                message=d["message"],
                span=d.get("span", {}),
                hint=d.get("hint"),
            )
            for d in res.get("diagnostics", [])
        ]
        return ParseResult(ast=res.get("ast", {}), diagnostics=diags)

    def status(self) -> Dict[str, Any]:
        """Fetch system status, health, and kill-switch state."""
        return self._request("GET", "/api/v1/system/status")


# Backwards compatibility alias
Client = ColtaneClient

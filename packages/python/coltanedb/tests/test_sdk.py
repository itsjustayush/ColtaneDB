import unittest
from unittest.mock import patch, MagicMock

from coltanedb import ColtaneClient, Client, query, collection, ColtaneAuthError, ColtaneQueryError


class QueryBuilderTests(unittest.TestCase):
    def test_query_builder_serializes_order_and_pagination(self):
        source = (
            query("users")
            .select("id", "email")
            .where("active == true")
            .order_by("created", desc=True)
            .limit(20)
            .offset(5)
            .to_colt()
        )

        self.assertEqual(
            source,
            "FIND users SELECT id, email\n"
            "WHERE active == true\n"
            "ORDER BY created DESC\n"
            "LIMIT 20\n"
            "OFFSET 5",
        )

    def test_collection_builder_emits_schema(self):
        source = (
            collection("users")
            .field("id", "uuid", "@key")
            .field("email", "text", "@unique")
            .to_colt()
        )

        self.assertIn("DEFINE COLLECTION users STRICT @backend(neon)", source)
        self.assertIn("id: uuid @key", source)
        self.assertIn("email: text @unique", source)


class ColtaneClientTests(unittest.TestCase):
    def test_client_alias_matches_coltane_client(self):
        self.assertIs(Client, ColtaneClient)

    def test_plan_sends_post_request(self):
        response = {
            "plan": {
                "steps": [
                    {
                        "backend": "neon",
                        "operation": "query",
                        "collection": "users",
                        "parameterizedStatement": 'SELECT "id" FROM "users"',
                        "params": [],
                    }
                ]
            },
            "diagnostics": [],
        }
        client = ColtaneClient("http://localhost:3000")
        with patch.object(client, "_request", return_value=response) as req:
            result = client.plan("FIND users SELECT id")

        self.assertTrue(result.is_valid)
        self.assertEqual(result.steps[0].backend, "neon")
        req.assert_called_once_with("POST", "/api/plan", {"source": "FIND users SELECT id"})

    def test_execute_sends_to_project_endpoint(self):
        client = ColtaneClient(
            base_url="http://localhost:3000",
            api_key="clt_live_test_secret",
            tenant_id="tnt_mytesttenant",
        )
        fake_response = {
            "success": True,
            "tenantId": "tnt_mytesttenant",
            "results": [[{"id": "u1", "title": "Test Book"}]],
            "diagnostics": [],
        }

        with patch.object(client, "_request", return_value=fake_response) as req:
            result = client.execute("FIND books SELECT title")

        self.assertTrue(result.success)
        self.assertEqual(len(result.rows), 1)
        self.assertEqual(result.rows[0]["title"], "Test Book")
        req.assert_called_once_with(
            "POST",
            "/api/v1/projects/tnt_mytesttenant/execute",
            {"source": "FIND books SELECT title", "parameters": {}},
        )

    def test_status_calls_system_endpoint(self):
        client = ColtaneClient("http://localhost:3000")
        with patch.object(client, "_request", return_value={"healthy": True}) as req:
            status = client.status()

        self.assertTrue(status.get("healthy"))
        req.assert_called_once_with("GET", "/api/v1/system/status")


if __name__ == "__main__":
    unittest.main()

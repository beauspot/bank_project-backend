import supertest from "supertest";
import { vi, describe, test, expect } from "vitest";

import createApp from "@/app";

vi.mock("@/utils/redis");
const app = createApp();

describe("index routing in a development/test env only!!!", () => {
  test("This should return the html contents of the index endpoints", async () => {
    // Test the get request to the index endpoint;
    const request = await supertest(app).get("/");

    expect(request.status).toBe(200);
    expect(request.type).toBe("text/html");
    expect(request.header["content-type"]).toBe("text/html; charset=utf-8");
    expect(request.text).toBe(
      '<h1>Bank-Hub API Documentation</h1><a href="/api-docs">Documentation</a>',
    );
  });
});

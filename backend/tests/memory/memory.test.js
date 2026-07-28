import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("mongoose", () => {
    const models = {};
    const MockSchema = jest.fn().mockImplementation(() => ({
        pre: jest.fn(),
        index: jest.fn(),
        methods: {}
    }));
    MockSchema.Types = {
        ObjectId: "ObjectId"
    };

    const MockMongoose = {
        connect: jest.fn().mockResolvedValue(true),
        Schema: MockSchema,
        Types: {
            ObjectId: "ObjectId"
        },
        model: jest.fn().mockImplementation((name) => {
            if (!models[name]) {
                models[name] = jest.fn().mockImplementation((data) => ({
                    ...data,
                    save: models[name].prototype.save,
                    _id: "mockid"
                }));
                models[name].prototype = {
                    save: jest.fn()
                };
                models[name].find = jest.fn();
                models[name].findOne = jest.fn();
                models[name].findOneAndDelete = jest.fn();
            }
            return models[name];
        }),
        pluralize: jest.fn()
    };
    return {
        default: MockMongoose
    };
});

// Dynamically import app and Memory AFTER the mock is registered
const app = (await import("../../server.js")).default;
const Memory = (await import("../../models/Memory.js")).default;

const JWT_SECRET = process.env.JWT_SECRET || "intellichat_jwt_secret_key_123";

describe("Memory APIs", () => {
    let token;

    beforeEach(() => {
        token = jwt.sign({ id: "mockuserid", email: "test@user.com", name: "Test User" }, JWT_SECRET);
        Memory.mockClear();
        Memory.find.mockReset();
        Memory.findOne.mockReset();
        Memory.findOneAndDelete.mockReset();
        Memory.prototype.save.mockReset();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /api/memory", () => {
        test("should retrieve all memories for authenticated user", async () => {
            const mockMemories = [
                { _id: "m1", title: "Favorite color", value: "Blue", category: "General" }
            ];
            Memory.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockMemories)
            });

            const res = await request(app)
                .get("/api/memory")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockMemories);
        });
    });

    describe("POST /api/memory", () => {
        test("should create a new memory", async () => {
            Memory.findOne.mockResolvedValue(null);
            Memory.prototype.save.mockResolvedValue(true);

            const res = await request(app)
                .post("/api/memory")
                .set("Authorization", `Bearer ${token}`)
                .send({ title: "Job", value: "Developer", category: "Work" });

            expect(res.statusCode).toBe(201);
            expect(res.body.title).toBe("Job");
        });

        test("should return 400 if title or value is missing", async () => {
            const res = await request(app)
                .post("/api/memory")
                .set("Authorization", `Bearer ${token}`)
                .send({ title: "Job" });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe("Title and Value are required fields");
        });

        test("should update value if duplicate memory exists", async () => {
            const existingMemory = {
                _id: "m3",
                title: "Job",
                value: "Old Value",
                save: jest.fn().mockResolvedValue(true)
            };
            Memory.findOne.mockResolvedValue(existingMemory);

            const res = await request(app)
                .post("/api/memory")
                .set("Authorization", `Bearer ${token}`)
                .send({ title: "Job", value: "New Value" });

            expect(res.statusCode).toBe(200);
            expect(existingMemory.value).toBe("New Value");
        });
    });

    describe("PUT /api/memory/:id", () => {
        test("should update memory values", async () => {
            const mockMemory = {
                _id: "m4",
                title: "Original Title",
                value: "Original Value",
                save: jest.fn().mockResolvedValue(true)
            };
            Memory.findOne.mockResolvedValue(mockMemory);

            const res = await request(app)
                .put("/api/memory/m4")
                .set("Authorization", `Bearer ${token}`)
                .send({ title: "New Title", value: "New Value" });

            expect(res.statusCode).toBe(200);
            expect(mockMemory.title).toBe("New Title");
            expect(mockMemory.value).toBe("New Value");
        });

        test("should return 404 if memory not found", async () => {
            Memory.findOne.mockResolvedValue(null);

            const res = await request(app)
                .put("/api/memory/wrongid")
                .set("Authorization", `Bearer ${token}`)
                .send({ title: "New Title" });

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe("Memory not found");
        });
    });

    describe("DELETE /api/memory/:id", () => {
        test("should delete memory successfully", async () => {
            Memory.findOneAndDelete.mockResolvedValue({ _id: "m5" });

            const res = await request(app)
                .delete("/api/memory/m5")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe("Memory deleted successfully");
        });

        test("should return 404 if memory to delete not found", async () => {
            Memory.findOneAndDelete.mockResolvedValue(null);

            const res = await request(app)
                .delete("/api/memory/wrongid")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe("Memory not found");
        });
    });
});

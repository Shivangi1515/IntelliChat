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

jest.unstable_mockModule("../../utils/groq.js", () => {
    return {
        __esModule: true,
        default: jest.fn().mockResolvedValue("Mocked AI response content"),
        extractMemoryActions: jest.fn().mockResolvedValue([])
    };
});

// Dynamically import app, Thread, and groq AFTER mocks are registered
const app = (await import("../../server.js")).default;
const Thread = (await import("../../models/Thread.js")).default;
const groq = (await import("../../utils/groq.js")).default;

const JWT_SECRET = process.env.JWT_SECRET || "intellichat_jwt_secret_key_123";

describe("Chat APIs", () => {
    let token;

    beforeEach(() => {
        token = jwt.sign({ id: "mockuserid", email: "test@user.com", name: "Test User" }, JWT_SECRET);
        Thread.mockClear();
        Thread.find.mockReset();
        Thread.findOne.mockReset();
        Thread.prototype.save.mockReset();
        groq.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /api/thread", () => {
        test("should get all threads for authenticated user", async () => {
            const mockThreads = [
                { _id: "t1", title: "Conversation 1", messages: [] }
            ];
            Thread.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockThreads)
            });

            const res = await request(app)
                .get("/api/thread")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockThreads);
        });
    });

    describe("GET /api/thread/:id", () => {
        test("should retrieve specific thread details", async () => {
            const mockThread = { _id: "t1", title: "Conversation 1", messages: [{ sender: "user", text: "Hello" }] };
            Thread.findOne.mockResolvedValue(mockThread);

            const res = await request(app)
                .get("/api/thread/t1")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockThread.messages);
        });

        test("should return 404 if thread not found", async () => {
            Thread.findOne.mockResolvedValue(null);

            const res = await request(app)
                .get("/api/thread/wrongid")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe("Thread not found");
        });
    });

    describe("POST /api/chat", () => {
        test("should return 400 if required fields are missing", async () => {
            const res = await request(app)
                .post("/api/chat")
                .set("Authorization", `Bearer ${token}`)
                .send({ message: "Hello" });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe("missing required fields");
        });
    });
});

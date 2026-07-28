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
                models[name] = jest.fn().mockImplementation(() => ({
                    save: models[name].prototype.save,
                    comparePassword: models[name].prototype.comparePassword,
                    _id: "mockuserid",
                    email: "test@user.com",
                    name: "Test User"
                }));
                models[name].prototype = {
                    save: jest.fn(),
                    comparePassword: jest.fn()
                };
                models[name].findOne = jest.fn();
                models[name].findById = jest.fn();
            }
            return models[name];
        }),
        pluralize: jest.fn()
    };
    return {
        default: MockMongoose
    };
});

// Dynamically import app and User AFTER the mock is registered
const app = (await import("../../server.js")).default;
const User = (await import("../../models/User.js")).default;

const JWT_SECRET = process.env.JWT_SECRET || "intellichat_jwt_secret_key_123";

describe("Auth APIs", () => {
    beforeEach(() => {
        User.mockClear();
        User.findOne.mockReset();
        User.findById.mockReset();
        User.prototype.save.mockReset();
        User.prototype.comparePassword.mockReset();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("POST /api/auth/register", () => {
        test("should register a new user successfully", async () => {
            User.findOne.mockResolvedValue(null);
            User.prototype.save.mockResolvedValue(true);

            const res = await request(app)
                .post("/api/auth/register")
                .send({ email: "test@user.com", password: "password123", name: "Test User" });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("token");
            expect(res.body.user.email).toBe("test@user.com");
        });

        test("should return 400 if email or password is missing", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({ email: "test@user.com" });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe("Email and password are required");
        });

        test("should return 400 if user already exists", async () => {
            User.findOne.mockResolvedValue({ email: "test@user.com" });

            const res = await request(app)
                .post("/api/auth/register")
                .send({ email: "test@user.com", password: "password123" });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe("User already exists with this email");
        });
    });

    describe("POST /api/auth/login", () => {
        test("should login successfully with valid credentials", async () => {
            const mockUser = {
                _id: "mockuserid",
                email: "test@user.com",
                name: "Test User",
                comparePassword: jest.fn().mockResolvedValue(true)
            };
            User.findOne.mockResolvedValue(mockUser);

            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "test@user.com", password: "password123" });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("token");
            expect(res.body.user.email).toBe("test@user.com");
        });

        test("should return 400 if user not found", async () => {
            User.findOne.mockResolvedValue(null);

            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "wrong@user.com", password: "password123" });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe("Invalid email or password");
        });

        test("should return 400 if password does not match", async () => {
            const mockUser = {
                email: "test@user.com",
                comparePassword: jest.fn().mockResolvedValue(false)
            };
            User.findOne.mockResolvedValue(mockUser);

            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "test@user.com", password: "wrongpassword" });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe("Invalid email or password");
        });
    });

    describe("GET /api/auth/me", () => {
        test("should return user profile if authenticated", async () => {
            const mockUser = {
                _id: "mockuserid",
                email: "test@user.com",
                name: "Test User"
            };
            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            const token = jwt.sign({ id: "mockuserid", email: "test@user.com", name: "Test User" }, JWT_SECRET);

            const res = await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.email).toBe("test@user.com");
        });
    });
});

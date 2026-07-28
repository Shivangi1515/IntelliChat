import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import authMiddleware from "../../middleware/auth.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "intellichat_jwt_secret_key_123";

describe("authMiddleware", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            header: jest.fn()
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should assign guestUser and call next if no Authorization header", () => {
        req.header.mockReturnValue(undefined);

        authMiddleware(req, res, next);

        expect(req.user).toEqual({
            id: "000000000000000000000000",
            email: "guest@intellichat.com",
            name: "Guest User"
        });
        expect(next).toHaveBeenCalled();
    });

    test("should assign guestUser and call next if token is 'null'", () => {
        req.header.mockReturnValue("Bearer null");

        authMiddleware(req, res, next);

        expect(req.user.email).toBe("guest@intellichat.com");
        expect(next).toHaveBeenCalled();
    });

    test("should assign guestUser and call next if token is 'undefined'", () => {
        req.header.mockReturnValue("Bearer undefined");

        authMiddleware(req, res, next);

        expect(req.user.email).toBe("guest@intellichat.com");
        expect(next).toHaveBeenCalled();
    });

    test("should decode valid token and assign req.user", () => {
        const payload = { id: "123", email: "user@test.com", name: "Test User" };
        const token = jwt.sign(payload, JWT_SECRET);
        req.header.mockReturnValue(`Bearer ${token}`);

        authMiddleware(req, res, next);

        expect(req.user).toMatchObject(payload);
        expect(next).toHaveBeenCalled();
    });

    test("should assign guestUser and call next if token signature verification fails", () => {
        req.header.mockReturnValue("Bearer invalidtoken");

        authMiddleware(req, res, next);

        expect(req.user.email).toBe("guest@intellichat.com");
        expect(next).toHaveBeenCalled();
    });
});

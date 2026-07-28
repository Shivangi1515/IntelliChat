import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Auth from "../Auth.jsx";
import { MyContext } from "../MyContext.jsx";
import { reloadPage, redirectPage } from "../utils/navigation.js";

// Mock the navigation module
jest.mock("../utils/navigation.js", () => ({
    reloadPage: jest.fn(),
    redirectPage: jest.fn()
}));

describe("Auth Component", () => {
    let mockContextValue;

    beforeEach(() => {
        mockContextValue = {
            setPrevChats: jest.fn(),
            setCurrThreadId: jest.fn(),
            setNewChat: jest.fn(),
            setReply: jest.fn()
        };

        // Mock localStorage
        Object.defineProperty(window, "localStorage", {
            value: {
                setItem: jest.fn(),
                getItem: jest.fn(),
                clear: jest.fn()
            },
            writable: true
        });

        // Mock global fetch
        global.fetch = jest.fn();
        
        // Mock console.error to avoid test output noise
        jest.spyOn(console, "error").mockImplementation(() => {});

        // Clear mock calls
        reloadPage.mockClear();
        redirectPage.mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const renderWithContext = () => {
        return render(
            <MyContext.Provider value={mockContextValue}>
                <Auth />
            </MyContext.Provider>
        );
    };

    test("should render Login screen by default", () => {
        renderWithContext();

        expect(screen.getByText("Welcome Back")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
        expect(screen.queryByPlaceholderText("John Doe")).not.toBeInTheDocument();
    });

    test("should toggle between Login and Signup screens", () => {
        renderWithContext();

        // Switch to Sign Up
        const toggleBtn = screen.getByText("Sign Up");
        fireEvent.click(toggleBtn);

        expect(screen.getByText("Create Account")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument();

        // Switch back to Sign In
        const signInToggle = screen.getByText("Sign In");
        fireEvent.click(signInToggle);

        expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    });

    test("should perform successful login", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: "mock_jwt_token" })
        });

        renderWithContext();

        fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "test@example.com" } });
        fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "password123" } });

        const submitBtn = screen.getByRole("button", { name: "Sign In" });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("http://localhost:8000/api/auth/login", expect.any(Object));
            expect(localStorage.setItem).toHaveBeenCalledWith("intellichat_token", "mock_jwt_token");
            expect(reloadPage).toHaveBeenCalled();
        });
    });

    test("should display error message on login failure", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Invalid credentials" })
        });

        renderWithContext();

        fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "wrong@example.com" } });
        fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "wrongpass" } });

        const submitBtn = screen.getByRole("button", { name: "Sign In" });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
        });
    });

    test("should display connection failed error on fetch throw", async () => {
        global.fetch.mockRejectedValueOnce(new Error("Network Error"));

        renderWithContext();

        fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "test@example.com" } });
        fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "password123" } });

        const submitBtn = screen.getByRole("button", { name: "Sign In" });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText("Connection failed. Is the server running?")).toBeInTheDocument();
        });
    });

    test("should redirect on Google login click", () => {
        renderWithContext();

        const googleBtn = screen.getByRole("button", { name: /continue with google/i });
        fireEvent.click(googleBtn);

        expect(redirectPage).toHaveBeenCalledWith("http://localhost:8000/api/auth/google");
    });
});

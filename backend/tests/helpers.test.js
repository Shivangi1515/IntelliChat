import { normalizeMemoryKey } from "../utils/helpers.js";

describe("normalizeMemoryKey", () => {
    test("should convert characters to lowercase", () => {
        expect(normalizeMemoryKey("USER_NAME")).toBe("user_name");
    });

    test("should trim outer spaces", () => {
        expect(normalizeMemoryKey("  favorite_language  ")).toBe("favorite_language");
    });

    test("should replace non-alphanumeric characters with underscores", () => {
        expect(normalizeMemoryKey("college name!")).toBe("college_name_");
        expect(normalizeMemoryKey("job-title#2026")).toBe("job_title_2026");
    });

    test("should return empty string for null/undefined inputs", () => {
        expect(normalizeMemoryKey(null)).toBe("");
        expect(normalizeMemoryKey(undefined)).toBe("");
    });
});

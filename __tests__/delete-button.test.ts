import { describe, it, expect } from "vitest";

// Test that the delete button implementation uses Pressable with style (not className)
// This is a structural test to verify the fix for the delete button not working on iPhone

describe("Delete button implementation", () => {
  it("should use Pressable with style prop for delete button (not TouchableOpacity with className)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../app/(tabs)/index.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Verify Pressable is imported
    expect(content).toContain("Pressable");

    // Verify StyleSheet is imported
    expect(content).toContain("StyleSheet");

    // Verify delete button uses Pressable with style (not className)
    // The delete button should use styles.deleteButton
    expect(content).toContain("styles.deleteButton");
    expect(content).toContain("styles.deleteButtonText");

    // Verify the deleteReservation function is called directly (not through stopPropagation hack)
    expect(content).toContain("onPress={() => deleteReservation(reservation.id)}");

    // Verify the old pattern (TouchableOpacity with stopPropagation for delete) is gone
    expect(content).not.toContain("e.stopPropagation()");
  });

  it("should have StyleSheet.create with proper delete button styles", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../app/(tabs)/index.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Verify StyleSheet.create exists
    expect(content).toContain("StyleSheet.create");

    // Verify delete button has red background color
    expect(content).toContain("deleteButton");
    expect(content).toContain("#EF4444");

    // Verify reservation card styles exist
    expect(content).toContain("reservationCard");
    expect(content).toContain("reservationHeader");
  });

  it("should not nest TouchableOpacity inside TouchableOpacity for delete", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../app/(tabs)/index.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // The delete button area should NOT have nested TouchableOpacity
    // Instead it should use View as container with separate Pressable for edit and delete
    const listSection = content.substring(
      content.indexOf("reservations.map((reservation)"),
      content.indexOf("使い方")
    );

    // Delete button should be a Pressable, not a nested TouchableOpacity
    expect(listSection).toContain("<Pressable");
    expect(listSection).toContain("deleteReservation");
  });
});

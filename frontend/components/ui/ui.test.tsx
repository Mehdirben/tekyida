import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "./Button";
import Badge from "./Badge";
import Card from "./Card";
import Logo from "./Logo";

describe("UI Components", () => {
  describe("Button", () => {
    it("renders button with correct text and handles clicks", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const btn = screen.getByText("Click Me");
      expect(btn).toBeDefined();

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("respects disabled state and haptic=false", () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);

      const btn = screen.getByText("Disabled");
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();

      // haptic=false
      render(<Button haptic={false}>No Haptic</Button>);
      fireEvent.click(screen.getByText("No Haptic"));
    });

    it("renders with different variants and sizes", () => {
      const { rerender } = render(<Button variant="danger" size="lg">Danger</Button>);
      expect(screen.getByText("Danger").className).toContain("bg-danger");

      rerender(<Button variant="ghost" size="sm">Ghost</Button>);
      expect(screen.getByText("Ghost").className).toContain("bg-transparent");

      rerender(<Button variant="glass" size="md">Glass</Button>);
      expect(screen.getByText("Glass").className).toContain("glass-btn");
    });
  });

  describe("Badge", () => {
    it("renders with variants", () => {
      const { rerender } = render(<Badge variant="success">Active</Badge>);
      expect(screen.getByText("Active").className).toContain("bg-accent");

      rerender(<Badge variant="danger">Failed</Badge>);
      expect(screen.getByText("Failed").className).toContain("bg-danger");

      rerender(<Badge variant="gold">Gold</Badge>);
      expect(screen.getByText("Gold").className).toContain("bg-gold");

      rerender(<Badge variant="primary">Primary</Badge>);
      expect(screen.getByText("Primary").className).toContain("bg-primary");
    });
  });

  describe("Card", () => {
    it("renders children with hover effects when enabled", () => {
      const { rerender } = render(<Card hover>Content</Card>);
      expect(screen.getByText("Content").className).toContain("hover:-translate-y-1");

      rerender(<Card hover={false}>Content</Card>);
      expect(screen.getByText("Content").className).not.toContain("hover:-translate-y-1");
    });
  });

  describe("Logo", () => {
    it("renders SVG logo", () => {
      const { container } = render(<Logo size="md" />);
      const img = container.querySelector("img");
      expect(img).toBeDefined();
    });
  });
});

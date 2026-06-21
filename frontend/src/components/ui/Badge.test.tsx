import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "./Badge";

describe("Badge", () => {
  it("affiche son contenu", () => {
    render(<Badge tone="success">Actif</Badge>);
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });

  it("applique la classe de la tonalité", () => {
    render(<Badge tone="danger">Désactivé</Badge>);
    expect(screen.getByText("Désactivé").className).toContain("text-danger");
  });
});

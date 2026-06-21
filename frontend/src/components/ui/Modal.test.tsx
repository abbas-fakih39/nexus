import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "./Modal";

describe("Modal", () => {
  it("ne rend rien quand elle est fermée", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Titre">
        contenu
      </Modal>,
    );
    expect(screen.queryByText("Titre")).not.toBeInTheDocument();
  });

  it("rend une boîte de dialogue nommée par son titre", () => {
    render(
      <Modal open onClose={() => {}} title="Ajouter un produit">
        contenu
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const title = screen.getByText("Ajouter un produit");
    expect(dialog).toHaveAttribute("aria-labelledby", title.id);
  });

  it("appelle onClose sur la touche Échap", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="X">
        c
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("appelle onClose via le bouton Fermer", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="X">
        c
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText("Fermer"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

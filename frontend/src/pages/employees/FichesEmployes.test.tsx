import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import FichesEmployes from "./FichesEmployes";

// On isole le composant de la couche réseau en mockant les modules API.
vi.mock("../../api/employees", () => ({
  getEmployees: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
}));
vi.mock("../../api/users", () => ({
  getAccounts: vi.fn(),
}));

import { getEmployees } from "../../api/employees";
import { getAccounts } from "../../api/users";

const employee = {
  id: "e1",
  firstName: "Sofiane",
  lastName: "Benali",
  jobTitle: "Caissier",
  baseSalary: "1700",
  hiredAt: "2023-09-15",
  leaveQuota: 25,
  createdAt: "2026-01-01",
  user: null,
  _count: { payments: 0 },
  leaveBalance: { quota: 25, taken: 5, pending: 0, remaining: 20 },
};

describe("FichesEmployes", () => {
  beforeEach(() => {
    vi.mocked(getEmployees).mockResolvedValue([employee] as never);
    vi.mocked(getAccounts).mockResolvedValue([] as never);
  });

  it("charge et affiche les fiches employés", async () => {
    render(<FichesEmployes />);
    // Le nom apparaît une fois les données chargées (useEffect).
    expect(await screen.findByText("Sofiane Benali")).toBeInTheDocument();
    expect(screen.getByText("Caissier")).toBeInTheDocument();
  });

  it("affiche le solde de congés restants", async () => {
    render(<FichesEmployes />);
    expect(await screen.findByText("20 / 25 j")).toBeInTheDocument();
  });

  it("expose la table sous un nom accessible", async () => {
    render(<FichesEmployes />);
    await screen.findByText("Sofiane Benali");
    expect(
      screen.getByRole("table", { name: "Fiches employés" }),
    ).toBeInTheDocument();
  });
});

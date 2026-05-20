import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkAccountStatus, createSupabaseAccount, sendMagicLink } from "../lib/authApi.js";
import { SignInPage } from "./SignInPage.jsx";

vi.mock("../lib/authApi.js", () => ({
  checkAccountStatus: vi.fn(),
  createSupabaseAccount: vi.fn(),
  sendMagicLink: vi.fn(),
  syncProfileSession: vi.fn(),
}));

function renderAuthPage(mode) {
  render(
    <MemoryRouter>
      <SignInPage mode={mode} />
    </MemoryRouter>,
  );
}

describe("SignInPage auth flow", () => {
  beforeEach(() => {
    vi.mocked(checkAccountStatus).mockReset();
    vi.mocked(createSupabaseAccount).mockReset();
    vi.mocked(sendMagicLink).mockReset();
  });

  it("validates required signup fields before calling the API", async () => {
    const user = userEvent.setup();

    renderAuthPage("signup");

    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(checkAccountStatus).not.toHaveBeenCalled();
  });

  it("shows confirmation messaging after Supabase creates a new account", async () => {
    const user = userEvent.setup();
    vi.mocked(checkAccountStatus).mockResolvedValue({
      email: "kartik@example.com",
      exists: false,
    });
    vi.mocked(createSupabaseAccount).mockResolvedValue({});

    renderAuthPage("signup");

    await user.type(screen.getByLabelText("Name"), "Kartik");
    await user.type(screen.getByLabelText("Email address"), "kartik@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(checkAccountStatus).toHaveBeenCalledWith("kartik@example.com");
    expect(createSupabaseAccount).toHaveBeenCalledWith({
      name: "Kartik",
      email: "kartik@example.com",
      password: "correct-horse",
    });
    expect(
      await screen.findByText("Check your email to confirm your account. The link will open your groups page."),
    ).toBeInTheDocument();
  });

  it("shows duplicate signup messaging when Supabase does not send an email for an existing account", async () => {
    const user = userEvent.setup();
    vi.mocked(checkAccountStatus).mockResolvedValue({
      email: "kartik@example.com",
      exists: true,
    });
    vi.mocked(createSupabaseAccount).mockResolvedValue({});

    renderAuthPage("signup");

    await user.type(screen.getByLabelText("Name"), "Kartik");
    await user.type(screen.getByLabelText("Email address"), "kartik@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(checkAccountStatus).toHaveBeenCalledWith("kartik@example.com");
    expect(await screen.findByText("An account already exists for this email. Sign in instead.")).toBeInTheDocument();
  });

  it("shows duplicate signup errors returned directly by Supabase", async () => {
    const user = userEvent.setup();
    vi.mocked(createSupabaseAccount).mockRejectedValue(
      new Error("An account already exists for this email. Sign in instead."),
    );

    renderAuthPage("signup");

    await user.type(screen.getByLabelText("Name"), "Kartik");
    await user.type(screen.getByLabelText("Email address"), "kartik@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(checkAccountStatus).not.toHaveBeenCalled();
    expect(await screen.findByText("An account already exists for this email. Sign in instead.")).toBeInTheDocument();
  });

  it("sends a magic link for an existing account", async () => {
    const user = userEvent.setup();
    vi.mocked(checkAccountStatus).mockResolvedValue({
      email: "kartik@example.com",
      exists: true,
    });
    vi.mocked(sendMagicLink).mockResolvedValue();

    renderAuthPage("signin");

    await user.type(screen.getByLabelText("Email address"), "Kartik@Example.com");
    await user.click(screen.getByRole("button", { name: "Send magic link" }));

    expect(sendMagicLink).toHaveBeenCalledWith("kartik@example.com");
    expect(await screen.findByText("Check your email for a magic link. It will open your groups page.")).toBeInTheDocument();
  });
});

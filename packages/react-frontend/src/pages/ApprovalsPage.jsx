import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader.jsx";
import { approvalRequests } from "@/data/recipes.js";

export function ApprovalsPage() {
  return (
    <section className="screen approvals-screen">
      <PageHeader
        eyebrow="Requests"
        title="Approvals"
        subtitle="Approve ingredient use before pantry counts change."
      />

      <div className="approval-stack">
        {approvalRequests.map((request) => (
          <article className="approval-card" key={request.id}>
            <span className="approval-card__avatar">{request.member[0]}</span>
            <div className="approval-card__body">
              <h2>
                {request.member} requested {request.item}
              </h2>
              <p>{request.recipe}</p>
              <small>Inventory impact: {request.remaining}</small>
              <div className="approval-actions">
                <button className="button" type="button">
                  <Check size={17} /> Approve
                </button>
                <button className="button button--dark" type="button">
                  <X size={17} /> Decline
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="approval-note surface-card">
        <h2>Approval rules</h2>
        <p>No ingredient is deducted until the owner approves the request.</p>
        <Link to="/groups">Back to Groups</Link>
      </section>
    </section>
  );
}

export function StatusMessage({ type = "loading", title, message }) {
  return (
    <section className={`status-message status-message--${type}`}>
      <p className="status-message__label">{type}</p>
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

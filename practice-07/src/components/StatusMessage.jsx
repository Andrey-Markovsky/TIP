export default function StatusMessage({ message, tone = 'info' }) {
  if (!message) return null;

  if (tone === 'error') {
    return (
      <p className="error" role="alert">
        {message}
      </p>
    );
  }

  return <p role="status">{message}</p>;
}
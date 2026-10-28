export default function FormError({ error }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mt-3.5 rounded-lg border border-danger bg-danger/10 px-3 py-2.5 text-sm text-danger"
    >
      <p>{error.message}</p>
      {error.details?.length > 0 && (
        <ul className="mt-1.5 list-disc pl-[18px]">
          {error.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { inputCls } from './ui.js';

export default function TextField({ label, ...inputProps }) {
  return (
    <label className="mt-3.5 flex flex-col gap-1.5">
      <span className="text-[13px] text-muted">{label}</span>
      <input className={inputCls} {...inputProps} />
    </label>
  );
}

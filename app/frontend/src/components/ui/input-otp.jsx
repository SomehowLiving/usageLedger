export { OTPInput as InputOTP, OTPInputContext as InputOTPContext } from "input-otp";
export const InputOTPGroup = (props) => <div className="flex items-center" {...props} />;
export const InputOTPSlot = ({ char, hasFakeCaret, isActive, ...props }) => <div className="relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm first:rounded-l-sm first:border-l last:rounded-r-sm" {...props}>{char}{hasFakeCaret || isActive ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-4 w-px animate-pulse bg-foreground" /></div> : null}</div>;
export const InputOTPSeparator = (props) => <div role="separator" {...props}>-</div>;

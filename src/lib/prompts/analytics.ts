import { event } from "@/lib/gtag";
import type { PromptId } from "./constants";

type DismissMethod = "x" | "esc" | "overlay";

interface PromptEventProps {
  promptId: PromptId;
  path: string;
  method?: DismissMethod;
}

export function emitPromptShown(props: PromptEventProps) {
  event("signup_prompt_shown", {
    prompt_id: props.promptId,
    path: props.path,
  });
}

export function emitPromptDismissed(props: PromptEventProps & { method: DismissMethod }) {
  event("signup_prompt_dismissed", {
    prompt_id: props.promptId,
    path: props.path,
    method: props.method,
  });
}

export function emitPromptClickedSignup(props: PromptEventProps) {
  event("signup_prompt_clicked_signup", {
    prompt_id: props.promptId,
    path: props.path,
  });
}

export function emitPromptClickedLogin(props: PromptEventProps) {
  event("signup_prompt_clicked_login", {
    prompt_id: props.promptId,
    path: props.path,
  });
}

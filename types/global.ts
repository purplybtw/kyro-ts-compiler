import type { FileInput, LocalErrors } from "../util/errors";
import type { LocalWarnings } from "../util/warnings";

export interface MainConfig {
  warn: LocalWarnings,
  errors: LocalErrors,
  file: FileInput
}

export interface BehaviourConfig { } // to-do
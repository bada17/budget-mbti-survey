import {
  AXES,
  TYPE_MAP,
  type AxisKey,
  type AxisProfile,
  type BudgetField,
  type BudgetProgram,
} from "./budget-data";
import { SURVEY_SCORE_TOTAL } from "./survey-v3-data";

export const SCORING_VERSION = "survey-v3-weighted-2026-08-01";
export const PROGRAM_DATASET_VERSION = "budget-programs-v2-2026-08-08";
export const CONSENT_VERSION = "privacy-v1.1-optional-profile";
export const BUDGET_SCORE_TOTAL = 30;

export const SCORING_WEIGHTS = {
  fieldSelection: 3,
  initialAllocation: 12,
  cuts: 9,
  addition: 6,
} as const;

type MoneyMap = Record<string, number>;

export function calculateBudgetScore({
  selectedFields,
  initialAllocation,
  cuts,
  addProgramId,
  fields,
  programs,
}: {
  selectedFields: BudgetField[];
  initialAllocation: MoneyMap;
  cuts: MoneyMap;
  addProgramId: string;
  fields: BudgetField[];
  programs: BudgetProgram[];
}) {
  const budgetScore: AxisProfile = { future: 0, growth: 0, universal: 0 };
  const programById = new Map(programs.map((program) => [program.id, program]));
  const selectedFieldIds = new Set(selectedFields.map((field) => field.id));
  const selectedFieldObjects = fields.filter((field) =>
    selectedFieldIds.has(field.id),
  );

  for (const axis of AXES) {
    const selectedFieldSignal =
      selectedFieldObjects.length > 0
        ? selectedFieldObjects.reduce(
            (total, field) => {
              const fieldPrograms = programs.filter(
                (program) => program.fieldId === field.id,
              );
              const fieldSignal = fieldPrograms.length
                ? fieldPrograms.reduce(
                    (sum, program) => sum + program.tags[axis.key],
                    0,
                  ) / fieldPrograms.length
                : field.profile[axis.key];
              return total + fieldSignal;
            },
            0,
          ) / selectedFieldObjects.length
        : 0;
    budgetScore[axis.key] +=
      (selectedFieldSignal / 2) * SCORING_WEIGHTS.fieldSelection;

    for (const [programId, amount] of Object.entries(initialAllocation)) {
      const program = programById.get(programId);
      if (program && amount > 0) {
        budgetScore[axis.key] +=
          (program.tags[axis.key] / 2) *
          (amount / 90_000) *
          SCORING_WEIGHTS.initialAllocation;
      }
    }

    for (const [programId, amount] of Object.entries(cuts)) {
      const program = programById.get(programId);
      if (program && amount > 0) {
        budgetScore[axis.key] -=
          (program.tags[axis.key] / 2) *
          (amount / 20_000) *
          SCORING_WEIGHTS.cuts;
      }
    }

    const addedProgram = programById.get(addProgramId);
    if (addedProgram) {
      budgetScore[axis.key] +=
        (addedProgram.tags[axis.key] / 2) * SCORING_WEIGHTS.addition;
    }
    budgetScore[axis.key] = Math.round(budgetScore[axis.key] * 10) / 10;
  }

  const boundedBudgetScore = Object.fromEntries(
    (Object.keys(budgetScore) as AxisKey[]).map((key) => [
      key,
      Math.round(
        Math.max(
          -BUDGET_SCORE_TOTAL,
          Math.min(BUDGET_SCORE_TOTAL, budgetScore[key]),
        ) * 10,
      ) / 10,
    ]),
  ) as AxisProfile;

  const displayScore = Object.fromEntries(
    (Object.keys(boundedBudgetScore) as AxisKey[]).map((key) => [
      key,
      Math.round((boundedBudgetScore[key] / BUDGET_SCORE_TOTAL) * 100),
    ]),
  ) as AxisProfile;
  const code = AXES.map((axis) =>
    boundedBudgetScore[axis.key] >= 0 ? "1" : "0",
  ).join("") as keyof typeof TYPE_MAP;
  const confidence = Math.round(
    AXES.reduce(
      (total, axis) => total + Math.abs(displayScore[axis.key]),
      0,
    ) /
      AXES.length,
  );

  return {
    score: displayScore,
    budgetScore: boundedBudgetScore,
    code,
    type: TYPE_MAP[code],
    confidence,
  };
}

export function calculateSurveyResult(surveyScore: AxisProfile) {
  const score = Object.fromEntries(
    (Object.keys(surveyScore) as AxisKey[]).map((key) => [
      key,
      Math.round(
        Math.max(-SURVEY_SCORE_TOTAL, Math.min(SURVEY_SCORE_TOTAL, surveyScore[key])) *
          10,
      ) / 10,
    ]),
  ) as AxisProfile;
  const code = AXES.map((axis) => (score[axis.key] >= 0 ? "1" : "0")).join(
    "",
  ) as keyof typeof TYPE_MAP;
  const confidence = Math.round(
    AXES.reduce((total, axis) => total + Math.abs(score[axis.key]), 0) /
      AXES.length,
  );

  return {
    score,
    surveyScore,
    code,
    type: TYPE_MAP[code],
    confidence,
  };
}

export function normalizeAxisProfile(
  profile: AxisProfile,
  total: number,
): AxisProfile {
  return Object.fromEntries(
    (Object.keys(profile) as AxisKey[]).map((key) => [
      key,
      Math.round((profile[key] / total) * 100),
    ]),
  ) as AxisProfile;
}

export function calculateAgreement(
  behavior: AxisProfile,
  selfReport: AxisProfile,
) {
  return Math.round(
    AXES.reduce(
      (total, axis) =>
        total + (100 - Math.abs(behavior[axis.key] - selfReport[axis.key]) / 2),
      0,
    ) / AXES.length,
  );
}

export const SCORE_TOTALS = {
  budget: BUDGET_SCORE_TOTAL,
  survey: SURVEY_SCORE_TOTAL,
} as const;

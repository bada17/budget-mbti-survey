import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const responses = sqliteTable(
  "responses",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().unique(),
    createdAt: text("created_at").notNull(),
    nickname: text("nickname").notNull(),
    ageGroup: text("age_group"),
    region: text("region"),
    resultType: text("result_type").notNull(),
    axisFuture: integer("axis_future").notNull(),
    axisGrowth: integer("axis_growth").notNull(),
    axisUniversal: integer("axis_universal").notNull(),
    confidence: integer("confidence").notNull(),
    weakAxesJson: text("weak_axes_json").notNull().default("[]"),
    statedPriority: text("stated_priority"),
    selectedFieldsJson: text("selected_fields_json").notNull(),
    initialAllocationJson: text("initial_allocation_json").notNull(),
    customProposalJson: text("custom_proposal_json"),
    cutsJson: text("cuts_json").notNull(),
    additionJson: text("addition_json").notNull(),
    increaseProposalJson: text("increase_proposal_json"),
    finalAllocationJson: text("final_allocation_json").notNull(),
    scoringVersion: text("scoring_version").notNull(),
    surveyDatasetVersion: text("survey_dataset_version")
      .notNull()
      .default("legacy-survey-v2"),
    programDatasetVersion: text("program_dataset_version").notNull(),
    consentVersion: text("consent_version").notNull(),
    researchConsent: integer("research_consent", { mode: "boolean" })
      .notNull()
      .default(false),
    completionMs: integer("completion_ms"),
    deleteTokenHash: text("delete_token_hash").notNull(),
    isTest: integer("is_test", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    index("responses_created_at_idx").on(table.createdAt),
    index("responses_result_type_idx").on(table.resultType),
  ],
);

export const validationResponses = sqliteTable("validation_responses", {
  responseId: text("response_id")
    .primaryKey()
    .references(() => responses.id, { onDelete: "cascade" }),
  answersJson: text("answers_json").notNull(),
  responseMetaJson: text("response_meta_json").notNull().default("{}"),
  selfFuture: integer("self_future").notNull(),
  selfGrowth: integer("self_growth").notNull(),
  selfUniversal: integer("self_universal").notNull(),
  agreement: integer("agreement").notNull(),
  accuracyRating: integer("accuracy_rating"),
  feedbackComment: text("feedback_comment"),
  feedbackAt: text("feedback_at"),
});



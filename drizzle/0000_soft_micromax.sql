CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`created_at` text NOT NULL,
	`nickname` text NOT NULL,
	`age_group` text,
	`region` text,
	`result_type` text NOT NULL,
	`axis_future` integer NOT NULL,
	`axis_growth` integer NOT NULL,
	`axis_universal` integer NOT NULL,
	`confidence` integer NOT NULL,
	`weak_axes_json` text DEFAULT '[]' NOT NULL,
	`stated_priority` text,
	`selected_fields_json` text NOT NULL,
	`initial_allocation_json` text NOT NULL,
	`custom_proposal_json` text,
	`cuts_json` text NOT NULL,
	`addition_json` text NOT NULL,
	`increase_proposal_json` text,
	`final_allocation_json` text NOT NULL,
	`scoring_version` text NOT NULL,
	`survey_dataset_version` text DEFAULT 'legacy-survey-v2' NOT NULL,
	`program_dataset_version` text NOT NULL,
	`consent_version` text NOT NULL,
	`research_consent` integer DEFAULT false NOT NULL,
	`completion_ms` integer,
	`delete_token_hash` text NOT NULL,
	`is_test` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `responses_session_id_unique` ON `responses` (`session_id`);--> statement-breakpoint
CREATE INDEX `responses_created_at_idx` ON `responses` (`created_at`);--> statement-breakpoint
CREATE INDEX `responses_result_type_idx` ON `responses` (`result_type`);--> statement-breakpoint
CREATE TABLE `validation_responses` (
	`response_id` text PRIMARY KEY NOT NULL,
	`answers_json` text NOT NULL,
	`response_meta_json` text DEFAULT '{}' NOT NULL,
	`self_future` integer NOT NULL,
	`self_growth` integer NOT NULL,
	`self_universal` integer NOT NULL,
	`agreement` integer NOT NULL,
	`accuracy_rating` integer,
	`feedback_comment` text,
	`feedback_at` text,
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE cascade
);

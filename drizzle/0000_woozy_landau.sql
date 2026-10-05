CREATE TABLE `oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`code_verifier` text NOT NULL,
	`redirect_to` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `oauth_states_expires_at_idx` ON `oauth_states` (`expires_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `snippet_files` (
	`id` text PRIMARY KEY NOT NULL,
	`snippet_id` text NOT NULL,
	`filename` text NOT NULL,
	`content` text NOT NULL,
	`language` text DEFAULT 'text' NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`snippet_id`) REFERENCES `snippets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `snippet_files_snippet_position_idx` ON `snippet_files` (`snippet_id`,`position`);--> statement-breakpoint
CREATE TABLE `snippets` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text,
	`owner_id` text NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snippets_slug_unique` ON `snippets` (`slug`);--> statement-breakpoint
CREATE INDEX `snippets_owner_created_idx` ON `snippets` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `snippets_visibility_created_idx` ON `snippets` (`visibility`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`login` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

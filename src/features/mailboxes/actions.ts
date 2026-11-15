"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  connectMailbox,
  defaultMailboxDeps,
  removeMailbox,
  testMailbox,
  type MailboxState,
} from "./service";

const deps = () => defaultMailboxDeps(createServiceClient);

export async function connectMailboxAction(
  siteId: string,
  _prev: MailboxState,
  formData: FormData,
): Promise<MailboxState> {
  const r = await connectMailbox(await createClient(), siteId, formData, deps());
  revalidatePath(`/app/site/${siteId}`);
  return r;
}

export async function testMailboxAction(
  siteId: string,
  mailboxId: string,
  _prev: MailboxState,
): Promise<MailboxState> {
  const r = await testMailbox(await createClient(), mailboxId, deps());
  revalidatePath(`/app/site/${siteId}`);
  return r;
}

export async function removeMailboxAction(
  siteId: string,
  mailboxId: string,
  _prev: MailboxState,
): Promise<MailboxState> {
  const r = await removeMailbox(await createClient(), mailboxId, deps());
  revalidatePath(`/app/site/${siteId}`);
  return r;
}

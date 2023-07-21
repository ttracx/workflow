"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { db, projectMembers } from "@turboseo/supabase/db";
import { cookies } from "next/headers";

export const getProjects = async () => {
  const supabase = createServerActionClient({ cookies });
  const session = await supabase.auth.getSession();
  return await db.query.projectMembers.findMany({
    where: (projectMembers, {eq}) => (eq(projectMembers.userId, session.data.session?.user.id!)),
    with: {
      project: true,
    }
  });
}
"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer.",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter an amount greater than $0." }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true, id: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice.",
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  // Insert data into the database
  let result;
  try {
    if (status === "pending") {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // Add 14 days
      result = await sql`
      INSERT INTO invoices (customer_id, amount, status, date, due_date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date}, ${
        dueDate.toISOString().split("T")[0]
      })
      RETURNING id;
    `;
    } else {
      result = await sql`
      INSERT INTO invoices (customer_id, amount, status, date,)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      RETURNING id;
    `;
    }
    const newInvoiceId = result.rows[0].id;
    await createNewLog(newInvoiceId, "---", status);
  } catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: "Database Error: Failed to Create Invoice.",
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function updateInvoice(
  id: string,
  oldStatus: string,
  prevState: State,
  formData: FormData
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Invoice.",
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
    await createNewLog(id, oldStatus, status);
  } catch (error) {
    return { message: "Database Error: Failed to Update Invoice." };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  // throw new Error('Failed to Delete Invoice');

  try {
    await sql`UPDATE invoices SET status = 'cancelled' WHERE id = ${id}`;
    revalidatePath("/dashboard/invoices");
    return { message: "Deleted Invoice" };
  } catch (error) {
    return { message: "Database Error: Failed to Delete Invoice." };
  }
}

export async function updateStatusFromDropdown(formdata: FormData) {
  const status = formdata.get("status") as string;
  const id = formdata.get("id") as string;
  const oldStatus = formdata.get("oldStatus") as string;

  try {
    if (status === "pending") {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // Add 14 days
      console.log(dueDate.toISOString().split("T")[0]);

      await sql`
        UPDATE invoices
        SET status = ${status}, due_date = ${
        dueDate.toISOString().split("T")[0]
      }
        WHERE id = ${id}
      `;
    } else {
      await sql`UPDATE invoices SET status = ${status} WHERE id = ${id}`;
    }
    await createNewLog(id, oldStatus, status);
  } catch (error) {
    console.log(error);
    return { message: "error during updating status" };
  }
  revalidatePath("/dashboard/invoices");
}

export async function tabAction(formdata: FormData) {
  const currentTab = (formdata.get("tabValue") as string) || "all";
  console.log(currentTab);
  const cookieStore = cookies();
  cookieStore.set("status", currentTab, {
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

export async function createNewLog(
  id: string,
  oldStatus: string,
  newStatus: string
) {
  const session = await auth();
  const username = session?.user?.email;

  try {
    // Step 2: Insert the new log into the invoice_audit_logs table
    await sql`
      INSERT INTO invoice_audit_logs (
        invoice_id,
        old_status,
        new_status,
        username,
        created_at
      ) 
      VALUES (
        ${id},
        ${oldStatus},
        ${newStatus},
        ${username},
        CURRENT_TIMESTAMP
      )
    `;

    console.log(`Log created successfully for Invoice ID: ${id}`);
  } catch (error) {
    console.error("Error creating log:", error);
    throw new Error("Failed to create audit log");
  }
}

export async function restoreAction(formdata: FormData) {
  const oldStatus = formdata.get("oldStatus") as string;
  const id = formdata.get("id") as string;
  const newStatus = formdata.get("newStatus") as string;
  try {
    if (oldStatus !== "---") {
      await createNewLog(id, newStatus, oldStatus);
    } else {
      return;
    }
  } catch (error) {
    return { message: "error during restore" };
  }
  revalidatePath(`/dashboard/invoices/${id}/edit`);
}

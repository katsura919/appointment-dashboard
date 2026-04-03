import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Appointment from "@/models/Appointment";
import FamilyMember from "@/models/FamilyMember";
import User from "@/models/User";
import { auth } from "@/auth";

const CATEGORIES = [
  "health_wellness",
  "education_development",
  "activities_enrichment",
  "life_logistics",
  "family_relationship",
  "administrative",
  "mom_personal_care",
] as const;

const RecurrenceSchema = z.object({
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  interval: z.number().default(1),
  endDate: z.string().datetime().optional(),
  occurrences: z.number().optional(),
  nextDate: z.string().datetime().optional(),
});

const CreateAppointmentSchema = z.object({
  title: z.string().min(1).trim(),
  category: z.enum(CATEGORIES),
  subcategory: z.string().trim().optional(),
  memberId: z.string().optional(),
  memberIds: z.array(z.string()).min(1),
  date: z.string().datetime().optional(),
  time: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isRecurring: z.boolean().default(false),
  recurrence: RecurrenceSchema.optional(),
  reminderRules: z.array(z.number()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Build filter from query params
    const filter: Record<string, any> = { userId };

    const category = searchParams.get("category");
    if (category) filter.category = category;

    const memberId = searchParams.get("memberId");
    const memberIdsParam = searchParams.get("memberIds");
    
    if (memberIdsParam) {
       filter.memberIds = { $in: memberIdsParam.split(",") };
    } else if (memberId) {
       filter.$or = [{ memberId: memberId }, { memberIds: memberId }];
    }

    const status = searchParams.get("status");
    if (status) filter.status = status;

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    if (startDate || endDate) {
      filter.$or = filter.$or || [];
      const dateQuery = {
        ...(startDate ? { $gte: new Date(startDate) } : {}),
        ...(endDate ? { $lte: new Date(endDate) } : {}),
      };
      
      const timeFilter = [ 
         { startsAt: dateQuery },
         { date: dateQuery, startsAt: { $exists: false } }
      ];
      
      if (filter.$or.length > 0) {
          filter.$and = [{ $or: filter.$or }, { $or: timeFilter }];
          delete filter.$or;
      } else {
          filter.$or = timeFilter;
      }
    }

    await connectDB();

    const appointments = await Appointment.find(filter)
      .populate("memberIds", "name role avatar color")
      .populate("memberId", "name role avatar")
      .sort({ startsAt: 1, date: 1 });

    return Response.json({ appointments }, { status: 200 });
    } catch (error) {
      console.error("[Appointments GET] Error fetching appointments:", error);
      return Response.json({ error: "Internal server error", details: String(error) }, { status: 500 });
    }
  }

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    
    // Dual-write normalization
    if (body.memberId && (!body.memberIds || body.memberIds.length === 0)) {
        body.memberIds = [body.memberId];
    }
    if (body.date && !body.startsAt) {
        body.startsAt = body.date;
    }

    const parsed = CreateAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    await connectDB();

    const appointment = await Appointment.create({
        ...parsed.data,
        userId,
        createdBy: userId,
        updatedBy: userId,
    });
    
    await appointment.populate("memberIds", "name role avatar color");

    return Response.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("[Appointments POST] Error:", error);
    return Response.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}

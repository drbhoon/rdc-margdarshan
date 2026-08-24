import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { answers } = await req.json();
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid answers format' }, { status: 400 });
    }

    // Answers format: array of strings containing dimension chosen ('D', 'I', 'S', 'C') for each question
    const counts = { D: 0, I: 0, S: 0, C: 0 };
    answers.forEach((ans: string) => {
      if (ans === 'D' || ans === 'I' || ans === 'S' || ans === 'C') {
        counts[ans] = (counts[ans] || 0) + 1;
      }
    });

    const total = Object.values(counts).reduce((acc, curr) => acc + curr, 0) || 1;
    
    // Convert to percentages
    const dominantPct = Math.round((counts.D / total) * 100);
    const influencePct = Math.round((counts.I / total) * 100);
    const steadinessPct = Math.round((counts.S / total) * 100);
    const compliancePct = Math.round((counts.C / total) * 100);

    const discRawResponse = {
      dominant: dominantPct,
      influence: influencePct,
      steadiness: steadinessPct,
      compliance: compliancePct,
    };

    // Find the highest-scoring category
    let maxVal = -1;
    let discStyle = 'S'; // Default fallback
    
    Object.entries(counts).forEach(([key, val]) => {
      if (val > maxVal) {
        maxVal = val;
        discStyle = key;
      }
    });

    // Check for double dominant styles (e.g. if two values are equal)
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] === sorted[1][1] && sorted[0][1] > 0) {
      discStyle = `${sorted[0][0]}/${sorted[1][0]}`;
    }

    // Update employee profile in DB
    const employee = await prisma.employee.update({
      where: { employeeCode: session.employeeCode },
      data: {
        discStyle,
        discRawResponse,
      },
    });

    return NextResponse.json({
      discStyle: employee.discStyle,
      discRawResponse: employee.discRawResponse,
    });
  } catch (error) {
    console.error('DISC generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

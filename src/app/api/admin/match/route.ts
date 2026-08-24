import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { COMPETENCY_MATRIX, Competency } from '@/lib/competencies';

export async function POST() {
  try {
    await ensureDatabaseSchema();
    const session = await getSession();
    if (session && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    // Get matching cohort or auto-create a rolling 3-month cohort
    let cohort = await prisma.cohort.findFirst({
      where: { status: 'MATCHING' },
    });

    if (!cohort) {
      const now = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(now.getMonth() + 3);

      cohort = await prisma.cohort.create({
        data: {
          name: 'Rolling 3-Month Mentoring Program (2026)',
          startDate: now,
          endDate: threeMonthsLater,
          status: 'MATCHING',
        },
      });
    }

    // Delete existing pairings for this cohort to prevent duplicate pairing collisions
    await prisma.mentoringPair.deleteMany({
      where: { cohortId: cohort.id },
    });

    // Load Mentees and Mentors
    const mentees = await prisma.employee.findMany({ where: { role: 'MENTEE' } });
    const mentors = await prisma.employee.findMany({ where: { role: 'MENTOR' } });

    // Track mentor current pairing counts
    const mentorCapacities: Record<string, number> = {};
    mentors.forEach((m) => {
      mentorCapacities[m.employeeCode] = m.mentorCapacity;
    });

    let pairsCreated = 0;

    // Helper functions for scoring
    const getDiscScore = (mStyle: string | null, eStyle: string | null): number => {
      if (!mStyle || !eStyle) return 0.5;
      
      // Simplify hybrid styles to first dominant trait
      const mChar = mStyle.charAt(0);
      const eChar = eStyle.charAt(0);

      if (mChar === eChar) return 0.4; // Identical: good but lacks growth tension

      // Complementary matches
      const complementary = [
        ['D', 'S'],
        ['S', 'D'],
        ['I', 'C'],
        ['C', 'I'],
      ];
      
      const isComplementary = complementary.some(([a, b]) => a === mChar && b === eChar);
      if (isComplementary) return 1.0;

      return 0.6; // Neutral
    };

    // Calculate competency overlap using primary focus and secondary cascade matrix
    const getCompetencyScore = (mTopics: string[], eTopics: string[]): number => {
      if (eTopics.length === 0) return 0.5;
      
      // Direct primary overlap
      const directMatches = eTopics.filter((t) => mTopics.includes(t)).length;
      
      // Secondary behavioral cascade overlap from framework matrix
      let secondaryMatches = 0;
      for (const eTopic of eTopics) {
        const secondaries = COMPETENCY_MATRIX[eTopic as Competency] || [];
        const hasSecondary = secondaries.some((sec) => mTopics.includes(sec));
        if (hasSecondary) secondaryMatches += 1;
      }

      if (directMatches > 0) {
        return Math.min(1.0, 0.7 + directMatches * 0.15 + secondaryMatches * 0.05);
      } else if (secondaryMatches > 0) {
        return Math.min(0.8, 0.4 + secondaryMatches * 0.1);
      }
      return 0.2;
    };

    // Greedy matching approach: For each mentee, calculate score with all available mentors
    // and assign them to the highest-scoring mentor who still has capacity.
    for (const mentee of mentees) {
      let bestMentorCode: string | null = null;
      let bestScore = -1;

      for (const mentor of mentors) {
        // Check remaining capacity
        const remainingCap = mentorCapacities[mentor.employeeCode] || 0;
        if (remainingCap <= 0) continue;

        // Calculate components
        const discScore = getDiscScore(mentor.discStyle, mentee.discStyle);
        const deptScore = mentor.department !== mentee.department ? 1.0 : 0.3; // Cross-functional preferred
        const compScore = getCompetencyScore(mentor.topics, mentee.topics);

        // Compute weighted score: DISC (35%), Department Diversity (25%), Competency Cascade (40%)
        const score = 0.35 * discScore + 0.25 * deptScore + 0.40 * compScore;

        if (score > bestScore) {
          bestScore = score;
          bestMentorCode = mentor.employeeCode;
        }
      }

      if (bestMentorCode) {
        // Create pairing
        await prisma.mentoringPair.create({
          data: {
            cohortId: cohort.id,
            menteeCode: mentee.employeeCode,
            mentorCode: bestMentorCode,
            status: 'PROPOSED',
            matchScore: bestScore,
          },
        });

        // Decrement capacity
        mentorCapacities[bestMentorCode] -= 1;
        pairsCreated += 1;
      }
    }

    return NextResponse.json({ success: true, pairsCreated });
  } catch (error: any) {
    console.error('Matching algorithm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

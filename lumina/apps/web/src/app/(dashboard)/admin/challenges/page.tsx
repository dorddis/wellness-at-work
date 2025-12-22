'use client';

import { useEffect, useState } from 'react';
import {
  Trophy,
  Plus,
  Calendar,
  Target,
  Users,
  Medal,
  Clock,
  CheckCircle,
  Loader2,
  X,
  Gift,
  Play,
} from 'lucide-react';
import { useAuth } from '../../../providers';
import {
  getTeamChallenges,
  getChallengeLeaderboard,
  createTeamChallenge,
  joinChallenge,
  type TeamChallenge,
  type ChallengeParticipant,
} from '@lumina/api';
import { Select } from '../../../../components/ui';

type ChallengeStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
type ChallengeType = 'break_compliance' | 'posture_health' | 'blink_health' | 'wellness_week' | 'exercise_streak';

const challengeTypeLabels: Record<ChallengeType, string> = {
  break_compliance: 'Break Compliance',
  posture_health: 'Posture Health',
  blink_health: 'Blink Health',
  wellness_week: 'Wellness Week',
  exercise_streak: 'Exercise Streak',
};

const statusColors: Record<ChallengeStatus, string> = {
  upcoming: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function ChallengesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<TeamChallenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<TeamChallenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<ChallengeParticipant[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ChallengeStatus | 'all'>('all');
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  // Create form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    challengeType: 'break_compliance' as ChallengeType,
    startDate: '',
    endDate: '',
    targetMetric: 20,
    targetUnit: 'breaks',
    prizeDescription: '',
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setLoading(true);
        const challengeList = await getTeamChallenges(user.organization!.id);
        setChallenges(challengeList);

        // Auto-select first active challenge or first in list
        const activeChallenge = challengeList.find((c) => c.status === 'active') ?? challengeList[0];
        if (activeChallenge) {
          setSelectedChallenge(activeChallenge);
        }
      } catch (error) {
        console.error('Failed to load challenges:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Load leaderboard when challenge is selected
  useEffect(() => {
    async function loadLeaderboard() {
      if (!selectedChallenge) {
        setLeaderboard([]);
        return;
      }

      try {
        setLeaderboardLoading(true);
        const participants = await getChallengeLeaderboard(selectedChallenge.id);
        setLeaderboard(participants);
      } catch (error) {
        console.error('Failed to load leaderboard:', error);
        setLeaderboard([]);
      } finally {
        setLeaderboardLoading(false);
      }
    }

    loadLeaderboard();
  }, [selectedChallenge]);

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organization?.id) return;

    try {
      setCreateLoading(true);
      await createTeamChallenge(user.organization.id, {
        name: formData.name,
        description: formData.description || undefined,
        challengeType: formData.challengeType,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        targetMetric: {
          metric: formData.challengeType,
          target: formData.targetMetric,
          unit: formData.targetUnit,
        },
        prizeDescription: formData.prizeDescription || undefined,
      });

      // Refresh challenges
      const updated = await getTeamChallenges(user.organization.id);
      setChallenges(updated);
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        challengeType: 'break_compliance',
        startDate: '',
        endDate: '',
        targetMetric: 20,
        targetUnit: 'breaks',
        prizeDescription: '',
      });
    } catch (error) {
      console.error('Failed to create challenge:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinChallenge = async () => {
    if (!selectedChallenge) return;

    try {
      setJoinLoading(true);
      await joinChallenge(selectedChallenge.id);
      // Refresh leaderboard
      const participants = await getChallengeLeaderboard(selectedChallenge.id);
      setLeaderboard(participants);
    } catch (error) {
      console.error('Failed to join challenge:', error);
    } finally {
      setJoinLoading(false);
    }
  };

  // Filter challenges
  const filteredChallenges = filterStatus === 'all'
    ? challenges
    : challenges.filter((c) => c.status === filterStatus);

  // Stats
  const activeChallenges = challenges.filter((c) => c.status === 'active').length;
  const upcomingChallenges = challenges.filter((c) => c.status === 'upcoming').length;
  const completedChallenges = challenges.filter((c) => c.status === 'completed').length;

  // Check if user has joined selected challenge
  const hasJoined = leaderboard.some((p) => p.userId === user?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading challenges...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Challenges</h1>
          <p className="text-muted-foreground">
            Motivate your team with wellness competitions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Challenge
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Play className="w-5 h-5 text-green-600" />}
          label="Active"
          value={activeChallenges}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          label="Upcoming"
          value={upcomingChallenges}
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-gray-600" />}
          label="Completed"
          value={completedChallenges}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Challenge list */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Challenges</h2>
                <Select
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active', icon: <Play className="w-3 h-3 text-green-600" /> },
                    { value: 'upcoming', label: 'Upcoming', icon: <Clock className="w-3 h-3 text-blue-600" /> },
                    { value: 'completed', label: 'Completed', icon: <CheckCircle className="w-3 h-3 text-gray-500" /> },
                  ]}
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val as ChallengeStatus | 'all')}
                  size="sm"
                  className="w-32"
                />
              </div>
            </div>
            <div className="card-body p-0">
              {filteredChallenges.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No challenges yet</p>
                  <p className="text-sm">Create one to get started!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredChallenges.map((challenge) => (
                    <button
                      key={challenge.id}
                      onClick={() => setSelectedChallenge(challenge)}
                      className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors ${
                        selectedChallenge?.id === challenge.id ? 'bg-secondary' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Trophy className={`w-5 h-5 mt-0.5 ${
                          challenge.status === 'active' ? 'text-green-600' : 'text-muted-foreground'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{challenge.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {challengeTypeLabels[challenge.challengeType as ChallengeType] ?? challenge.challengeType}
                          </p>
                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[challenge.status as ChallengeStatus]}`}>
                            {challenge.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Challenge details & leaderboard */}
        <div className="lg:col-span-2 space-y-6">
          {selectedChallenge ? (
            <>
              {/* Challenge details card */}
              <div className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[selectedChallenge.status as ChallengeStatus]}`}>
                        {selectedChallenge.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {challengeTypeLabels[selectedChallenge.challengeType as ChallengeType]}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold">{selectedChallenge.name}</h2>
                    {selectedChallenge.description && (
                      <p className="text-muted-foreground mt-1">{selectedChallenge.description}</p>
                    )}
                  </div>
                  {selectedChallenge.status === 'active' && !hasJoined && (
                    <button
                      onClick={handleJoinChallenge}
                      disabled={joinLoading}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      {joinLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Users className="w-4 h-4" />
                      )}
                      Join Challenge
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedChallenge.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">End Date</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedChallenge.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Goal</p>
                      <p className="text-sm font-medium">
                        {selectedChallenge.targetMetric.target} {selectedChallenge.targetMetric.unit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Participants</p>
                      <p className="text-sm font-medium">{leaderboard.length}</p>
                    </div>
                  </div>
                </div>

                {selectedChallenge.prizeDescription && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg flex items-start gap-2">
                    <Gift className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Prize</p>
                      <p className="text-sm text-amber-700">{selectedChallenge.prizeDescription}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Leaderboard */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Medal className="w-5 h-5 text-amber-500" />
                    Leaderboard
                  </h3>
                </div>
                <div className="card-body p-0">
                  {leaderboardLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No participants yet</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Participant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Progress
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {leaderboard.map((participant, index) => {
                          const rank = index + 1;
                          const target = selectedChallenge.targetMetric.target;
                          const percentage = Math.min(100, Math.round((participant.currentProgress / target) * 100));

                          return (
                            <tr key={participant.id} className="hover:bg-secondary/30">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {rank === 1 ? (
                                    <Medal className="w-5 h-5 text-amber-500" />
                                  ) : rank === 2 ? (
                                    <Medal className="w-5 h-5 text-gray-400" />
                                  ) : rank === 3 ? (
                                    <Medal className="w-5 h-5 text-amber-700" />
                                  ) : (
                                    <span className="text-muted-foreground w-5 text-center">{rank}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                                    {participant.userEmail?.charAt(0).toUpperCase() ?? '?'}
                                  </div>
                                  <span className="text-sm font-medium">
                                    {participant.userName || participant.userEmail || 'Unknown'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                {participant.department ?? '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium w-16 text-right">
                                    {participant.currentProgress}/{target}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="card p-12 text-center text-muted-foreground">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a challenge to view details</p>
              <p className="text-sm">Or create a new one to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold">Create New Challenge</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChallenge} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Challenge Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., January Wellness Challenge"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                  placeholder="Optional description of the challenge"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Challenge Type *</label>
                <Select
                  options={Object.entries(challengeTypeLabels).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  value={formData.challengeType}
                  onChange={(val) => {
                    const type = val as ChallengeType;
                    let unit = 'breaks';
                    if (type === 'posture_health') unit = 'minutes good posture';
                    if (type === 'blink_health') unit = 'healthy blink minutes';
                    if (type === 'wellness_week') unit = 'wellness points';
                    if (type === 'exercise_streak') unit = 'exercises';
                    setFormData({ ...formData, challengeType: type, targetUnit: unit });
                  }}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Target *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.targetMetric}
                    onChange={(e) => setFormData({ ...formData, targetMetric: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.targetUnit}
                    onChange={(e) => setFormData({ ...formData, targetUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., breaks, points"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prize (Optional)</label>
                <input
                  type="text"
                  value={formData.prizeDescription}
                  onChange={(e) => setFormData({ ...formData, prizeDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Extra day off, Gift card"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {createLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { CSEvaluation } from '@/lib/supabase';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

interface EvaluationTableProps {
  evaluations: CSEvaluation[];
}

export default function EvaluationTable({ evaluations }: EvaluationTableProps) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTicket, setSearchTicket] = useState('');
  const [searchAgent, setSearchAgent] = useState('');
  const [searchChannel, setSearchChannel] = useState('');
  const [searchTags, setSearchTags] = useState('');

  // Filter evaluations based on search
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((evaluation) => {
      const matchesTicket = searchTicket === '' || 
        (evaluation.ticket_id?.toLowerCase() || '').includes(searchTicket.toLowerCase());
      const matchesAgent = searchAgent === '' || 
        (evaluation.agent_name?.toLowerCase() || '').includes(searchAgent.toLowerCase());
      const matchesChannel = searchChannel === '' || 
        (evaluation.channel_account?.toLowerCase() || '').includes(searchChannel.toLowerCase());
      const matchesTags = searchTags === '' || 
        (evaluation.tags?.toLowerCase() || '').includes(searchTags.toLowerCase());
      return matchesTicket && matchesAgent && matchesChannel && matchesTags;
    });
  }, [evaluations, searchTicket, searchAgent, searchChannel, searchTags]);

  // Group evaluations by ticket_id
  const groupedEvaluations = useMemo(() => {
    const grouped = new Map<string, CSEvaluation[]>();
    
    filteredEvaluations.forEach((evaluation) => {
      const ticketId = evaluation.ticket_id || 'N/A';
      if (!grouped.has(ticketId)) {
        grouped.set(ticketId, []);
      }
      grouped.get(ticketId)!.push(evaluation);
    });
    
    // Convert to array and sort by most recent evaluation
    return Array.from(grouped.entries())
      .map(([ticketId, evals]) => ({
        ticketId,
        evaluations: evals.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        latestEval: evals.reduce((latest, current) => 
          new Date(current.created_at) > new Date(latest.created_at) ? current : latest
        ),
        count: evals.length,
        avgScore: evals.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evals.length
      }))
      .sort((a, b) => 
        new Date(b.latestEval.created_at).getTime() - new Date(a.latestEval.created_at).getTime()
      );
  }, [filteredEvaluations]);

  // Get evaluations for selected ticket
  const selectedEvaluations = useMemo(() => {
    if (!selectedTicketId) return [];
    const group = groupedEvaluations.find(g => g.ticketId === selectedTicketId);
    return group ? group.evaluations : [];
  }, [selectedTicketId, groupedEvaluations]);

  // Get unique agents for filter
  const uniqueAgents = useMemo(() => {
    const agents = new Set(evaluations.map(e => e.agent_name).filter(Boolean));
    return Array.from(agents).sort();
  }, [evaluations]);

  // Get unique channels for filter
  const uniqueChannels = useMemo(() => {
    const channels = new Set(evaluations.map(e => e.channel_account).filter(Boolean));
    return Array.from(channels).sort();
  }, [evaluations]);

  // Calculate pagination
  const totalPages = Math.ceil(groupedEvaluations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEvaluations = useMemo(
    () => groupedEvaluations.slice(startIndex, endIndex),
    [groupedEvaluations, startIndex, endIndex]
  );

  // Reset to page 1 if current page exceeds total pages
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTicket('');
    setSearchAgent('');
    setSearchChannel('');
    setSearchTags('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTicket !== '' || searchAgent !== '' || searchChannel !== '' || searchTags !== '';

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score > 80) return 'text-blue-600 dark:text-blue-400';      // 81-100: Excellent (Blue)
    if (score > 60) return 'text-green-600 dark:text-green-400';    // 61-80: Good (Green)
    if (score > 40) return 'text-yellow-600 dark:text-yellow-400';  // 41-60: Average (Yellow)
    if (score > 20) return 'text-orange-600 dark:text-orange-400';  // 21-40: Below average (Orange)
    return 'text-red-600 dark:text-red-400';                        // 0-20: Poor (Red)
  };

  const getScoreBadge = (score: number | null) => {
    if (!score) return 'bg-gray-100 text-gray-600';
    if (score > 80) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';           // 81-100: Excellent
    if (score > 60) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';       // 61-80: Good
    if (score > 40) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';   // 41-60: Average
    if (score > 20) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';   // 21-40: Below average
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';                               // 0-20: Poor
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Evaluations
              </h3>
              {hasActiveFilters && (
                <span className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                  {filteredEvaluations.length} result{filteredEvaluations.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
            </div>
          </div>
          
          {/* Search Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by ticket number..."
                  value={searchTicket}
                  onChange={(e) => {
                    setSearchTicket(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <select
                  value={searchAgent}
                  onChange={(e) => {
                    setSearchAgent(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-4 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    searchAgent ? 'border-blue-500 dark:border-blue-400 font-medium' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">🔍 Filter by Agent</option>
                  {uniqueAgents.map((agent) => (
                    <option key={agent} value={agent || ''}>
                      {agent}
                    </option>
                  ))}
                </select>
                {searchAgent && (
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">
                      Active
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <select
                value={searchChannel}
                onChange={(e) => {
                  setSearchChannel(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Channels</option>
                {uniqueChannels.map((channel) => (
                  <option key={channel} value={channel || ''}>
                    {channel}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by tags..."
                  value={searchTags}
                  onChange={(e) => {
                    setSearchTags(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>
          
          {hasActiveFilters && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Found {groupedEvaluations.length} ticket{groupedEvaluations.length !== 1 ? 's' : ''} ({filteredEvaluations.length} evaluation{filteredEvaluations.length !== 1 ? 's' : ''})
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ticket ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Evaluations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Latest Metrics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {currentEvaluations.map((group) => (
                <tr key={group.ticketId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {group.ticketId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {group.latestEval.agent_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {group.latestEval.channel_account || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {group.count} eval{group.count !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBadge(group.avgScore)}`}>
                      {group.avgScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <span className="text-gray-600 dark:text-gray-400" title="Accuracy">
                        A: <span className={getScoreColor(group.latestEval.accuracy)}>{group.latestEval.accuracy || 0}</span>
                      </span>
                      <span className="text-gray-600 dark:text-gray-400" title="Tone">
                        T: <span className={getScoreColor(group.latestEval.tone)}>{group.latestEval.tone || 0}</span>
                      </span>
                      <span className="text-gray-600 dark:text-gray-400" title="Clarity">
                        C: <span className={getScoreColor(group.latestEval.clarity)}>{group.latestEval.clarity || 0}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(group.latestEval.created_at), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedTicketId(group.ticketId)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {startIndex + 1} to {Math.min(endIndex, groupedEvaluations.length)} of {groupedEvaluations.length} tickets
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  
                  const showEllipsis = 
                    (page === currentPage - 2 && currentPage > 3) ||
                    (page === currentPage + 2 && currentPage < totalPages - 2);

                  if (showEllipsis) {
                    return (
                      <span key={page} className="px-2 text-gray-400 dark:text-gray-600">
                        ...
                      </span>
                    );
                  }

                  if (!showPage) return null;

                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for ticket details */}
      {selectedTicketId && selectedEvaluations.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedTicketId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ticket Details</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedTicketId} • {selectedEvaluations.length} evaluation{selectedEvaluations.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicketId(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {selectedEvaluations.map((evaluation, index) => (
                <div key={evaluation.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Evaluation #{selectedEvaluations.length - index}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {format(new Date(evaluation.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                      {evaluation.tags && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2">
                            {evaluation.tags.split(',').map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      {evaluation.customer_name && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
                          <p className="text-base font-semibold text-gray-900 dark:text-white">{evaluation.customer_name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Agent</p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">{evaluation.agent_name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Channel</p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">{evaluation.channel_account || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Scores */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Scores</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Accuracy</p>
                        <p className={`text-xl font-bold ${getScoreColor(evaluation.accuracy)}`}>{evaluation.accuracy || 0}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tone</p>
                        <p className={`text-xl font-bold ${getScoreColor(evaluation.tone)}`}>{evaluation.tone || 0}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Clarity</p>
                        <p className={`text-xl font-bold ${getScoreColor(evaluation.clarity)}`}>{evaluation.clarity || 0}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Complete</p>
                        <p className={`text-xl font-bold ${getScoreColor(evaluation.completeness)}`}>{evaluation.completeness || 0}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Relevance</p>
                        <p className={`text-xl font-bold ${getScoreColor(evaluation.relevance)}`}>{evaluation.relevance || 0}</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Overall</p>
                        <p className={`text-xl font-bold ${getScoreColor(evaluation.overall_score)}`}>{evaluation.overall_score?.toFixed(1) || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Message</h4>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 h-32 overflow-y-auto">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{evaluation.customer_message || 'N/A'}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CS Reply</h4>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 h-32 overflow-y-auto">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{evaluation.cs_reply || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Reply */}
                  {evaluation.suggested_reply && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI Suggested Reply
                      </h4>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{evaluation.suggested_reply}</p>
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  {evaluation.feedback && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Feedback</h4>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{evaluation.feedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface Topic {
  id: string;
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: string | number;
  questions: { id: string }[];
}

interface SearchTopicsProps {
  onSelectTopic: (topicId: string, topicName: string) => void;
}

export const SearchTopics: React.FC<SearchTopicsProps> = ({ onSelectTopic }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);

  const subjects = ['Programming', 'CSS', 'Web Development'];

  useEffect(() => {
    // Adding a debounce to prevent too many requests during typing
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedSubject]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<Topic[]>(
        `/topics/search?q=${searchQuery}&subject=${selectedSubject}`
      );
      setTopics(response);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">Search Topics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border rounded focus:outline-none focus:border-blue-500"
          />
          
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2 border rounded focus:outline-none focus:border-blue-500"
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <p className="text-gray-500">Loading topics...</p>}
        
        {topics.map(topic => (
          <div key={topic.id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg mb-2">{topic.topic}</h3>
            <p className="text-sm text-gray-600 mb-2">📚 {topic.subject}</p>
            <p className="text-xs text-gray-500 mb-3">{topic.subtopic}</p>
            <p className="text-sm mb-3">
              ❓ {topic.questions?.length || 0} questions
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {topic.difficulty === 1 || topic.difficulty === 'beginner' ? '🟢 Easy' : 
                 topic.difficulty === 2 || topic.difficulty === 'intermediate' ? '🟡 Medium' : '🔴 Hard'}
              </span>
              <button
                onClick={() => onSelectTopic(topic.id, topic.topic)}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                Play Game
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

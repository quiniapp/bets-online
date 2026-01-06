import React from 'react';
import { Clock, User, FileText, MessageSquare, Star } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'login' | 'document' | 'comment' | 'rating' | 'profile';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface UserActivityProps {
  activities?: ActivityItem[];
  showHeader?: boolean;
  maxItems?: number;
}

const UserActivity: React.FC<UserActivityProps> = ({ 
  activities = [], 
  showHeader = true, 
  maxItems = 10 
}) => {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'login':
        return <User className="w-4 h-4 text-green-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'rating':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'profile':
        return <User className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const displayedActivities = activities.slice(0, maxItems);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      )}
      
      <div className="p-6">
        {displayedActivities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.description}
                  </p>
                  
                  {activity.user && (
                    <div className="flex items-center mt-2">
                      {activity.user.avatar ? (
                        <img
                          src={activity.user.avatar}
                          alt={activity.user.name}
                          className="w-5 h-5 rounded-full mr-2"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-gray-300 rounded-full mr-2 flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            {activity.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-gray-500">
                        {activity.user.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {activities.length > maxItems && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View all activity ({activities.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActivity;

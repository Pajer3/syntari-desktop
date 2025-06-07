// Syntari AI IDE - Project Watch Notification Component
// Displays intelligent notifications about file watching strategies for different project sizes

import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { X, Info, AlertTriangle, CheckCircle } from 'lucide-react';

interface ProjectWatchNotification {
  notificationType: string;
  title: string;
  message: string;
  strategy: string;
  performanceNote: string;
  autoDismiss: boolean;
}

interface NotificationProps {
  notification: ProjectWatchNotification;
  onDismiss: () => void;
}

const NotificationContent: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const getIcon = () => {
    switch (notification.notificationType) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.notificationType) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={`rounded-lg border ${getBorderColor()} p-4 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getIcon()}
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              {notification.title}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {notification.message}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span className="font-medium">Strategy: {notification.strategy}</span>
                <span>•</span>
                <span>{notification.performanceNote}</span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ProjectWatchNotificationManager: React.FC = () => {
  const [notifications, setNotifications] = useState<Array<ProjectWatchNotification & { id: string }>>([]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unsubscribe = await listen('project-watch-notification', (event: any) => {
          const notification = event.payload as ProjectWatchNotification;
          const id = `notification-${Date.now()}-${Math.random()}`;
          
          setNotifications(prev => [...prev, { ...notification, id }]);

          // Auto-dismiss if specified
          if (notification.autoDismiss) {
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== id));
            }, 5000); // 5 seconds
          }
        });
      } catch (error) {
        console.error('Failed to setup project watch notification listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <NotificationContent
          key={notification.id}
          notification={notification}
          onDismiss={() => dismissNotification(notification.id)}
        />
      ))}
    </div>
  );
}; 
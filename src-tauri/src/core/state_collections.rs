// Syntari AI IDE - Generic State Collection Management
// Eliminates repetitive CRUD patterns across state management

use std::collections::HashMap;
use tokio::sync::Mutex;
use crate::core::{AppResult, AppError};

// ================================
// GENERIC STATE COLLECTION TRAIT
// ================================

/// Generic trait for managing collections in application state
#[async_trait::async_trait]
pub trait StateCollection<T: Clone + Send + Sync> {
    /// Get the collection identifier for error messages
    fn collection_name() -> &'static str;
    
    /// Get the item identifier for error messages  
    fn item_name() -> &'static str;
    
    /// Extract the ID from an item
    fn get_id(item: &T) -> String;
    
    /// Create error for item not found
    fn not_found_error(id: &str) -> AppError {
        AppError::internal(
            "ITEM_NOT_FOUND",
            &format!("{} '{}' not found in {}", Self::item_name(), id, Self::collection_name())
        )
    }
    
    /// Add an item to the collection
    async fn add_item(
        collection: &Mutex<HashMap<String, T>>,
        item: T
    ) -> AppResult<()> {
        let mut map = collection.lock().await;
        let id = Self::get_id(&item);
        map.insert(id.clone(), item);
        tracing::debug!("Added {} '{}' to {}", Self::item_name(), id, Self::collection_name());
        Ok(())
    }
    
    /// Get an item from the collection
    async fn get_item(
        collection: &Mutex<HashMap<String, T>>,
        id: &str
    ) -> Option<T> {
        let map = collection.lock().await;
        map.get(id).cloned()
    }
    
    /// Update an item in the collection
    async fn update_item(
        collection: &Mutex<HashMap<String, T>>,
        item: T
    ) -> AppResult<()> {
        let mut map = collection.lock().await;
        let id = Self::get_id(&item);
        map.insert(id.clone(), item);
        tracing::debug!("Updated {} '{}' in {}", Self::item_name(), id, Self::collection_name());
        Ok(())
    }
    
    /// Remove an item from the collection
    async fn remove_item(
        collection: &Mutex<HashMap<String, T>>,
        id: &str
    ) -> AppResult<()> {
        let mut map = collection.lock().await;
        if map.remove(id).is_some() {
            tracing::info!("Removed {} '{}' from {}", Self::item_name(), id, Self::collection_name());
            Ok(())
        } else {
            Err(Self::not_found_error(id))
        }
    }
    
    /// List all items in the collection
    async fn list_items(
        collection: &Mutex<HashMap<String, T>>
    ) -> Vec<T> {
        let map = collection.lock().await;
        map.values().cloned().collect()
    }
    
    /// Check if an item exists
    async fn exists(
        collection: &Mutex<HashMap<String, T>>,
        id: &str
    ) -> bool {
        let map = collection.lock().await;
        map.contains_key(id)
    }
    
    /// Get collection size
    async fn count(
        collection: &Mutex<HashMap<String, T>>
    ) -> usize {
        let map = collection.lock().await;
        map.len()
    }
    
    /// Clear all items from the collection
    async fn clear(
        collection: &Mutex<HashMap<String, T>>
    ) {
        let mut map = collection.lock().await;
        let count = map.len();
        map.clear();
        tracing::info!("Cleared {} items from {}", count, Self::collection_name());
    }
}

// ================================
// GENERIC OPTIONAL STATE MANAGEMENT
// ================================

/// Generic trait for managing optional single values in state
#[async_trait::async_trait]
pub trait OptionalStateValue<T: Clone + Send + Sync> {
    /// Get the value name for logging
    fn value_name() -> &'static str;
    
    /// Set the value
    async fn set_value(
        holder: &Mutex<Option<T>>,
        value: T
    ) -> AppResult<()> {
        let mut current = holder.lock().await;
        *current = Some(value);
        tracing::debug!("Set {}", Self::value_name());
        Ok(())
    }
    
    /// Get the value
    async fn get_value(
        holder: &Mutex<Option<T>>
    ) -> Option<T> {
        let current = holder.lock().await;
        current.clone()
    }
    
    /// Clear the value
    async fn clear_value(
        holder: &Mutex<Option<T>>
    ) {
        let mut current = holder.lock().await;
        *current = None;
        tracing::debug!("Cleared {}", Self::value_name());
    }
    
    /// Check if value is set
    async fn has_value(
        holder: &Mutex<Option<T>>
    ) -> bool {
        let current = holder.lock().await;
        current.is_some()
    }
}

// ================================
// PREFERENCE MANAGEMENT TRAIT
// ================================

/// Generic trait for managing key-value preferences
#[async_trait::async_trait]
pub trait PreferenceManager {
    /// Get a preference value
    async fn get_preference(
        preferences: &Mutex<HashMap<String, serde_json::Value>>,
        key: &str
    ) -> Option<serde_json::Value> {
        let prefs = preferences.lock().await;
        prefs.get(key).cloned()
    }
    
    /// Set a preference value
    async fn set_preference(
        preferences: &Mutex<HashMap<String, serde_json::Value>>,
        key: &str,
        value: serde_json::Value
    ) -> AppResult<()> {
        let mut prefs = preferences.lock().await;
        prefs.insert(key.to_string(), value);
        tracing::debug!("Updated preference: {}", key);
        Ok(())
    }
    
    /// Get all preferences
    async fn get_all_preferences(
        preferences: &Mutex<HashMap<String, serde_json::Value>>
    ) -> HashMap<String, serde_json::Value> {
        let prefs = preferences.lock().await;
        prefs.clone()
    }
    
    /// Remove a preference
    async fn remove_preference(
        preferences: &Mutex<HashMap<String, serde_json::Value>>,
        key: &str
    ) -> AppResult<bool> {
        let mut prefs = preferences.lock().await;
        let existed = prefs.remove(key).is_some();
        if existed {
            tracing::debug!("Removed preference: {}", key);
        }
        Ok(existed)
    }
    
    /// Clear all preferences
    async fn clear_preferences(
        preferences: &Mutex<HashMap<String, serde_json::Value>>
    ) {
        let mut prefs = preferences.lock().await;
        let count = prefs.len();
        prefs.clear();
        tracing::info!("Cleared {} preferences", count);
    }
} 
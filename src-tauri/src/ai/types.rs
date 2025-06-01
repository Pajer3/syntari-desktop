// Syntari AI IDE - AI Domain Types
// Data structures for AI providers, requests, and responses

use serde::{Deserialize, Serialize};
use crate::project::types::ProjectContext;

// ================================
// AI PROVIDER TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiProvider {
    pub id: String,
    pub name: String,
    pub provider_type: String,
    pub is_available: bool,
    pub cost_per_token: f64,
    pub latency: u64,
    pub specialties: Vec<String>,
}

impl AiProvider {
    pub fn new(
        id: impl Into<String>,
        name: impl Into<String>,
        provider_type: impl Into<String>,
    ) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            provider_type: provider_type.into(),
            is_available: true,
            cost_per_token: 0.0,
            latency: 0,
            specialties: Vec::new(),
        }
    }
    
    pub fn with_cost(mut self, cost_per_token: f64) -> Self {
        self.cost_per_token = cost_per_token;
        self
    }
    
    pub fn with_latency(mut self, latency: u64) -> Self {
        self.latency = latency;
        self
    }
    
    pub fn with_specialties(mut self, specialties: Vec<String>) -> Self {
        self.specialties = specialties;
        self
    }
}

// ================================
// AI REQUEST TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiRequest {
    pub id: String,
    pub prompt: String,
    pub context: Option<ProjectContext>,
    pub provider: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub timestamp: u64,
}

impl AiRequest {
    pub fn new(id: impl Into<String>, prompt: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            prompt: prompt.into(),
            context: None,
            provider: None,
            max_tokens: None,
            temperature: None,
            timestamp: crate::core::current_timestamp(),
        }
    }
    
    pub fn with_context(mut self, context: ProjectContext) -> Self {
        self.context = Some(context);
        self
    }
    
    pub fn with_provider(mut self, provider: impl Into<String>) -> Self {
        self.provider = Some(provider.into());
        self
    }
    
    pub fn with_max_tokens(mut self, max_tokens: u32) -> Self {
        self.max_tokens = Some(max_tokens);
        self
    }
    
    pub fn with_temperature(mut self, temperature: f32) -> Self {
        self.temperature = Some(temperature);
        self
    }
}

// ================================
// AI RESPONSE TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiResponse {
    pub id: String,
    pub request_id: String,
    pub provider: String,
    pub content: String,
    pub confidence: f64,
    pub cost: f64,
    pub response_time: u64,
    pub timestamp: u64,
}

impl AiResponse {
    pub fn new(
        request_id: impl Into<String>,
        provider: impl Into<String>,
        content: impl Into<String>,
    ) -> Self {
        Self {
            id: crate::core::generate_id(),
            request_id: request_id.into(),
            provider: provider.into(),
            content: content.into(),
            confidence: 0.0,
            cost: 0.0,
            response_time: 0,
            timestamp: crate::core::current_timestamp(),
        }
    }
    
    pub fn with_confidence(mut self, confidence: f64) -> Self {
        self.confidence = confidence;
        self
    }
    
    pub fn with_cost(mut self, cost: f64) -> Self {
        self.cost = cost;
        self
    }
    
    pub fn with_response_time(mut self, response_time: u64) -> Self {
        self.response_time = response_time;
        self
    }
}

// ================================
// AI CONSENSUS TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusResult {
    pub best_response: AiResponse,
    pub alternative_responses: Vec<AiResponse>,
    pub confidence_score: f64,
    pub total_cost: f64,
    pub reasoning: String,
}

impl ConsensusResult {
    pub fn single_response(response: AiResponse, reasoning: impl Into<String>) -> Self {
        let confidence = response.confidence;
        let cost = response.cost;
        
        Self {
            best_response: response,
            alternative_responses: Vec::new(),
            confidence_score: confidence,
            total_cost: cost,
            reasoning: reasoning.into(),
        }
    }
    
    pub fn with_alternatives(mut self, alternatives: Vec<AiResponse>) -> Self {
        self.alternative_responses = alternatives;
        self
    }
}

// ================================
// INTERNAL API RESPONSE TYPES
// ================================

#[derive(Debug, Serialize, Deserialize)]
pub struct AiApiResponse {
    pub content: String,
    pub confidence: f64,
    pub cost: f64,
    pub response_time: u64,
}

impl AiApiResponse {
    pub fn new(content: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            confidence: 0.0,
            cost: 0.0,
            response_time: 0,
        }
    }
}

// ================================
// CONTEXT7 INTEGRATION TYPES
// ================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Context7LibraryResult {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub documentation_coverage: Option<u32>,
    pub trust_score: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Context7DocsResult {
    pub library_id: String,
    pub content: String,
    pub tokens_used: u32,
    pub topic_focused: Option<String>,
} 
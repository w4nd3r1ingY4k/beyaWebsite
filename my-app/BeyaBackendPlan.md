# Beya Backend Implementation Plan
## Agentic Context-Powered Business Platform - 10 Seat Pilot

> **Mission**: Build an AI business assistant ("B") that delivers "wow, I didn't know that" moments by analyzing real-time business data to surface previously hidden insights through context-aware interactions.

---

## 🎯 **Executive Summary**

**What We're Building**: A real-time context engine that ingests data from Shopify, Business Central BI, and HubSpot to deliver actionable insights through an LLM-powered interface.

**Key Innovation**: Context-aware AI that understands what users are doing RIGHT NOW and surfaces relevant insights at the perfect moment.

**Goal**: 10 pilot users experiencing 3+ "wow moments" per week through Command-B chat and proactive notifications.

---

## 🏗️ **System Architecture**

### Data Flow Pipeline
```
Business Tools → OAuth2 → Event Ingestion → Intent Analysis → EventBridge
                                                                    ↓
Platform Activity → Real-time Tracking → Behavior Analysis → Context Boosting
                                                                    ↓
EventBridge → Chunking → Embedding → Pinecone Vector DB → RAG → LLM → Insights
```

### Core Infrastructure
- **Event Schema**: Unified format with source tracking, user context, and intent metadata
- **Vector Storage**: 4 specialized Pinecone indexes
  - `customer-context`: All customer interactions
  - `sales-pipeline`: Deal flow and timing patterns  
  - `team-activity`: Individual and team performance
  - `user-intent`: Real-time platform behavior (hot partition)
- **Intelligence Layer**: GPT-4 primary, GPT-3.5 fallback
- **Interface**: Command-B chat + proactive modal notifications

---

## ⚡ **Key Technical Innovations**

### 1. Intent-Driven Context Boosting
```python
# Dynamic vector weighting based on current user activity
if user_viewing_customer_profile:
    boost_customer_vectors(customer_id)
elif user_in_sales_dashboard: 
    boost_pipeline_vectors(time_range)
elif user_searching:
    boost_search_related_vectors(query)
```

### 2. Smart Insight Timing
- **Don't Interrupt**: Only show insights when user is receptive
- **Enhance Workflow**: Surface insights related to current task
- **Context Triggers**: 
  - Viewing customer → Recent changes
  - Sales dashboard → Pipeline risks
  - Active search → Related insights
  - Page dwell time → Deeper analysis

### 3. Intelligent Chunking
- **Order events**: Full order + customer context
- **Communications**: Sliding window with conversation history
- **CRM updates**: Changed fields + related entities
- **Negative space**: Generate "missing action" events

---

## 📅 **Implementation Timeline (10 Weeks)**

### Phase 1: Foundation (Weeks 1-2)
**Focus**: Core infrastructure and authentication
- OAuth2 integration framework (HubSpot, Shopify, Business Central BI)
- Platform activity tracking SDK
- Event ingestion pipeline (Kinesis → Lambda → EventBridge)
- Core AWS infrastructure setup

### Phase 2: Context Engine (Weeks 3-4)  
**Focus**: Vectorization and storage
- Vectorization pipeline with intelligent chunking
- Pinecone setup with 4 specialized indexes
- Intent-driven retrieval algorithms
- Performance optimization (<100ms embedding)

### Phase 3: Intelligence Layer (Weeks 5-6)
**Focus**: LLM integration and insight generation  
- RAG orchestration service with context weighting
- Insight generation engine with contextual triggers
- LLM integration (GPT-4/3.5) with prompt versioning
- Smart notification timing algorithms

### Phase 4: User Interface (Weeks 7-8)
**Focus**: Command-B interface and proactive insights
- Command-B chat with global keyboard shortcut
- Proactive insight modal system
- Basic action execution with user confirmation
- Context visualization components

### Phase 5: Pilot Launch (Weeks 9-10)
**Focus**: Testing, optimization, and pilot readiness
- End-to-end testing and performance tuning
- Sub-200ms response time optimization  
- User onboarding materials and documentation
- Launch metrics dashboard

---

## 🎯 **Core Insight Types**

1. **Sales Cycle Variance**: "Your sales cycle is increasing by 23% this quarter"
2. **Customer Patterns**: "This customer is a repeat buyer - here's their brief"
3. **Deal Momentum**: "3 deals in your pipeline have stalled for 2+ weeks"
4. **Engagement Changes**: "Customer engagement dropped 40% after last interaction"
5. **Next-Best-Actions**: "Based on similar customers, suggest upsell opportunity"

---

## 🔧 **Event Schema Structure**

```json
{
  "eventId": "uuid",
  "timestamp": "ISO-8601", 
  "source": "hubspot|shopify|businesscentral|platform",
  "userId": "uuid",
  "orgId": "uuid",
  "eventType": "order.created|contact.updated|search.performed|page.viewed",
  "data": { /* source-specific payload */ },
  "metadata": {
    "tier": 1-4,
    "department": "string", 
    "personalContext": boolean,
    "sessionId": "uuid",
    "userIntent": "researching|comparing|troubleshooting|exploring"
  }
}
```

---

## 📊 **Success Criteria**

### Launch Definition (MVP)
- ✅ OAuth connections operational for all 3 platforms
- ✅ Real-time event ingestion working
- ✅ Context vectorization and storage functional
- ✅ Command-B chat answering business questions
- ✅ 5+ insight types generating proactively
- ✅ Basic action execution with user confirmation
- ✅ Sub-200ms simple query response times
- ✅ Insight accuracy feedback mechanism

### Pilot Success Metrics
- **Daily Active Users**: 10 users using daily
- **Insight Quality**: >80% positive feedback
- **Wow Factor**: 3+ "didn't know that" moments per user per week  
- **Action Rate**: 50% of suggested actions acknowledged/taken
- **Performance**: Sub-200ms for simple queries

---

## 🔒 **Security & Compliance**

### GDPR Compliance
- **Right to deletion**: Vector deletion by userId
- **Data export**: API endpoint for user data retrieval
- **Consent tracking**: OAuth consent timestamps
- **Data minimization**: Only business-relevant content

### SOC2 Requirements  
- **Encryption**: TLS in transit, AES-256 at rest
- **Access logs**: CloudTrail for all API calls
- **Audit trail**: Event sourcing for mutations
- **Backup**: Daily Pinecone backups to S3

---

## ⚠️ **Risk Register**

| Risk | Impact | Mitigation |
|------|---------|------------|
| Integration API changes | High | Version pinning, error handling, alerts |
| LLM hallucinations | Medium | Confidence scoring, source attribution |
| Data sync delays | Medium | Real-time webhooks, polling backup |
| Token limits exceeded | Low | Dynamic context windowing |
| User adoption | High | Strong onboarding, quick wins focus |

---

## 🔄 **Current AWS Infrastructure**

### Existing Lambda Functions
1. **`beya-reminders-api`** - Reminders system with EventBridge scheduling
2. **`beya-inbox-email-receive`** - Email processing with threading support

### Existing DynamoDB  
- **`beya-reminders`** table with GSI for user queries

### Account Details
- **Region**: us-east-1
- **Account**: 575108947335
- **IAM Role**: lambda-execution-role

---

## 🚀 **Immediate Next Steps**

### Technical Setup
1. Provision Pinecone instance and configure indexes
2. Set up integration app registrations (HubSpot, Shopify, Business Central)
3. Design detailed event schemas for each data source
4. Choose embedding model (OpenAI ada-002 vs alternatives)
5. Select monitoring stack (DataDog vs CloudWatch)

### Pilot Preparation  
1. Identify 10 pilot users and document their workflows
2. Map current pain points and "insight gaps"
3. Create feedback collection mechanism
4. Set up success criteria scorecard

### Development Environment
1. AWS account provisioning with proper IAM roles
2. Development environment setup
3. CI/CD pipeline for rapid iteration
4. Testing framework for insight quality validation

---

## 🎯 **Key Performance Targets**

- **Embedding latency**: <100ms per event
- **Storage latency**: <50ms write, <100ms read  
- **Query response**: <200ms for simple queries
- **Insight generation**: Every 15 minutes + real-time triggers
- **Uptime**: 99.9% availability during pilot

---

## 📖 **Reference Architecture Diagrams**

### System Overview
```
Data Sources (Shopify/HubSpot/BC) + Platform Activity
                    ↓
            Intent Analysis & Validation  
                    ↓
                EventBridge
                    ↓
    Chunking → Embedding → Pinecone Vector DB
                    ↓
        Context-Aware Query Interface
                    ↓
          RAG Orchestrator + LLM
                    ↓
      Command-B Chat + Proactive Insights
```

## **📋 OAuth2 Implementation Checklist:**

For each platform, you'll need:

□ App registration (get client_id/secret)
□ OAuth2 flow endpoints (authorize, token, refresh)
□ Token storage with encryption
□ Token refresh mechanism
□ Connection status tracking
□ Webhook endpoint registration
□ Initial data sync capability

Once you have OAuth2 working and data flowing in, then you can tackle:
- Event ingestion pipeline
- Vectorization
- Context engine

Want to start with the OAuth2 framework architecture? I can help you design the Lambda functions and database schema needed for secure token management and connection tracking. 

---

*This document serves as the comprehensive reference for the Beya backend implementation plan. All technical decisions, timelines, and success criteria should refer back to this specification.* 


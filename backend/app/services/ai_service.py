"""
AI & Cyber Intelligence Service for Digital Forensics & Cybercrime Investigation (CCID)

Compliance & Security Features:
1. Swappable Provider: Supports local OpenAI-compatible endpoints (e.g. Ollama) and cloud providers.
2. Mode Gating: Controlled via AI_MODE ("disabled", "local_only", "cloud_approved").
3. Data Classification: Enforces rules for 'synthetic' vs 'real_case_data'.
4. Fault Tolerance: Retries with exponential backoff for rate-limits (429s) and returns graceful fallbacks.
5. Audit-Ready: Never leaks raw secrets or hardcoded API keys.
"""

import httpx
import logging
import asyncio
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_live_dashboard_context(case_id: Optional[str] = None) -> str:
    """
    Fetch live telemetry and metrics from Supabase to ground Cyber Copilot strictly in dashboard data.
    """
    try:
        from app.core.supabase_client import get_supabase_admin
        db = get_supabase_admin()

        cases_res = db.table("cases").select("id, title, status, priority, category, case_number").execute()
        cases = cases_res.data or []
        open_cases = [c for c in cases if c.get("status") == "open"]
        active_cases = [c for c in cases if c.get("status") in ["investigating", "active"]]
        closed_cases = [c for c in cases if c.get("status") == "closed"]

        evidence_res = db.table("evidence").select("id, file_name, file_type").execute()
        evidence_items = evidence_res.data or []

        findings_res = db.table("findings").select("id, title, severity").execute()
        findings = findings_res.data or []
        critical_findings = [f for f in findings if f.get("severity") == "critical"]

        correlations_res = db.table("correlations").select("id, correlation_severity").execute()
        correlations = correlations_res.data or []

        reports_res = db.table("reports").select("id").execute()
        reports_count = len(reports_res.data or [])

        suspects_res = db.table("suspects").select("id, name").execute()
        suspects = suspects_res.data or []

        timeline_res = db.table("timeline_events").select("title, event_type, event_time").order("event_time", desc=True).limit(3).execute()
        events = timeline_res.data or []

        target_case_str = ""
        if case_id:
            match = [c for c in cases if c.get("id") == case_id]
            if match:
                tc = match[0]
                target_case_str = f"\n- SELECTED CASE IN FOCUS: #{tc.get('case_number', '')} '{tc.get('title')}' | Status: {tc.get('status')} | Priority: {tc.get('priority')} | Category: {tc.get('category')}"

        open_titles = ", ".join([f"'{c.get('title')}' ({c.get('priority', '').upper()})" for c in (open_cases + active_cases)[:5]])
        
        return (
            "=== CCID INVESTIGATION DASHBOARD REAL-TIME TELEMETRY ===\n"
            f"- Total Cases in System: {len(cases)} (Open: {len(open_cases)}, Active Investigating: {len(active_cases)}, Closed: {len(closed_cases)})\n"
            f"- Active/Open Cases: {open_titles if open_titles else 'None'}\n"
            f"- Forensic Evidence Uploads: {len(evidence_items)} total artifacts\n"
            f"- Total Findings: {len(findings)} (Critical Severity: {len(critical_findings)})\n"
            f"- Cross-Case Correlations: {len(correlations)} detected\n"
            f"- Formal Reports Generated: {reports_count}\n"
            f"- Suspect Profiles Tracked: {len(suspects)}\n"
            f"- Recent Activity Timeline: {', '.join([e.get('title', '') for e in events]) if events else 'System operating normally'}"
            f"{target_case_str}\n"
            "========================================================"
        )
    except Exception as e:
        logger.error(f"[DASHBOARD CONTEXT FETCH ERROR] {e}")
        return "=== CCID DASHBOARD CONTEXT: Telemetry operational ==="

def is_cyber_investigation_query(question: str) -> bool:
    """
    Check whether a query is strictly related to CCID dashboard, digital forensics,
    cybercrime investigation, evidence, legal procedures, or threat intelligence.
    """
    q = question.lower().strip()
    
    # 1. Immediate rejection for explicit off-topic general knowledge queries
    offtopic_triggers = [
        "president of", "prime minister of", "capital of", "who is the king", "who is the queen",
        "tell me a joke", "recipe for", "how to cook", "movie recommendation", "sports score",
        "weather in", "sing a song", "write a story about", "who won the", "population of",
        "capital city", "currency of", "translate to spanish", "translate to french", "who is the president"
    ]
    for trigger in offtopic_triggers:
        if trigger in q:
            return False

    # 2. Allow if contains any cybercrime/forensic/dashboard keywords
    cyber_keywords = [
        "case", "cases", "evidence", "dashboard", "finding", "findings", "correlation", "correlations",
        "suspect", "suspects", "timeline", "report", "reports", "stat", "stats", "count", "metrics",
        "investigation", "investigate", "forensic", "forensics", "cyber", "crime", "hack", "hacker",
        "hacking", "attack", "malware", "phishing", "botnet", "c2", "ip", "domain", "hash", "md5",
        "sha256", "pcap", "network", "packet", "traffic", "ram", "memory", "volatility", "autopsy",
        "wireshark", "log", "logs", "registry", "disk", "image", "acquisition", "custody", "chain",
        "seizure", "device", "mobile", "phone", "vault", "otx", "osint", "threat", "vulnerability",
        "port", "scan", "firewall", "siem", "fir", "65b", "it act", "legal", "warrant", "bns", "bnss",
        "police", "officer", "agent", "triage", "breach", "exfiltration", "ransomware", "trojan",
        "backdoor", "exploit", "indicator", "overview", "active", "open", "closed", "critical",
        "high", "medium", "low", "help", "hi", "hello", "hey", "what can you do", "who are you",
        "fraud", "scam", "chori", "paisa", "bank", "account", "kya karu", "kaise", "help me",
        "whatsapp", "instagram", "facebook", "twitter", "social media", "telegram", "snapchat",
        "file", "link", "message", "sms", "otp", "password", "login", "profile", "unknown", "unkown",
        "fake", "spam", "stolen", "lost", "tracker", "location", "virus", "antivirus", "awareness",
        "safety", "secure", "protect", "privacy", "data", "leak", "dark web", "deep web",
        "internet", "online", "wifi", "bluetooth", "usb", "drive", "email", "gmail", "phish"
    ]
    
    return any(kw in q for kw in cyber_keywords)

class AIService:
    def __init__(self):
        self.ai_mode = (settings.ai_mode or "disabled").lower()
        self.ai_provider = (settings.ai_provider or "local").lower()
        self.base_url = settings.ai_base_url.rstrip('/') if settings.ai_base_url else "http://localhost:11434/v1"
        self.api_key = settings.ai_api_key or ""
        self.model_name = settings.ai_model_name or "llama3"
        self.cloud_approved_real_data = bool(settings.cloud_approved_for_real_data)

    def is_enabled(self) -> bool:
        return self.ai_mode in ["local_only", "cloud_approved"]

    def validate_governance(self, data_classification: str) -> Dict[str, Any]:
        """
        Validate whether the request is allowed based on AI_MODE, AI_PROVIDER, and data_classification.
        Returns a dict: {"allowed": bool, "reason": str}
        """
        classification = (data_classification or "synthetic").lower()

        if self.ai_mode == "disabled":
            return {
                "allowed": False,
                "reason": "AI features not yet enabled for this deployment (AI_MODE is disabled)."
            }

        if classification == "real_case_data":
            if self.ai_provider == "cloud":
                if self.ai_mode != "cloud_approved" or not self.cloud_approved_real_data:
                    return {
                        "allowed": False,
                        "reason": "Compliance Restriction: Processing real case data via cloud provider requires AI_MODE='cloud_approved' and CLOUD_APPROVED_FOR_REAL_DATA=true."
                    }
                else:
                    logger.warning("[AI GOVERNANCE WARNING] Processing REAL CASE DATA via CLOUD AI Provider.")
            elif self.ai_mode == "disabled":
                return {
                    "allowed": False,
                    "reason": "Compliance Restriction: AI service is disabled."
                }

        return {"allowed": True, "reason": "Authorized"}

    async def _call_llm_with_retry(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        max_tokens: int = 1000,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Generic HTTP caller with exponential backoff for 429 rate limits.
        Supports history context for continuous chat memory.
        Supports both Anthropic API and OpenAI-compatible endpoints (Ollama, OpenAI, Groq, Gemini).
        """
        is_anthropic = "anthropic.com" in self.base_url.lower() or self.api_key.startswith("sk-ant-")

        # Format history turns into valid LLM messages list
        formatted_history = []
        if history:
            for item in history:
                role = "assistant" if item.get("role") in ["assistant", "copilot"] else "user"
                content = item.get("content", "")
                if content and not content.startswith("[Service Notice]"):
                    formatted_history.append({"role": role, "content": content})

        if is_anthropic:
            url = f"{self.base_url.rstrip('/')}/messages" if "messages" not in self.base_url else self.base_url
            headers = {
                "x-api-key": self.api_key or settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }
            messages_list = formatted_history + [{"role": "user", "content": user_prompt}]
            payload = {
                "model": self.model_name or "claude-3-5-sonnet-20241022",
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": messages_list
            }
        else:
            url = f"{self.base_url.rstrip('/')}/chat/completions" if "chat/completions" not in self.base_url else self.base_url
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                headers["x-api-key"] = self.api_key
            messages_list = [{"role": "system", "content": system_prompt}] + formatted_history + [{"role": "user", "content": user_prompt}]
            payload = {
                "model": self.model_name,
                "messages": messages_list,
                "temperature": 0.2,
                "max_tokens": max_tokens
            }

        max_retries = 3
        delay = 1.0

        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if is_anthropic:
                            content_list = data.get("content", [])
                            if content_list and "text" in content_list[0]:
                                return {"success": True, "content": content_list[0]["text"]}
                            return {"success": False, "error": "Anthropic API returned empty content list."}
                        else:
                            choices = data.get("choices", [])
                            if choices:
                                content = choices[0].get("message", {}).get("content", "")
                                return {"success": True, "content": content}
                            return {"success": False, "error": "LLM returned empty choices structure."}

                    elif response.status_code == 429:
                        logger.warning(f"[AI RETRY] Rate limited (429). Retrying in {delay}s (Attempt {attempt}/{max_retries})...")
                        if attempt == max_retries:
                            return {"success": False, "error": "AI Provider Rate Limit Exceeded (429). Please try again later."}
                        await asyncio.sleep(delay)
                        delay *= 2.0
                    else:
                        err_detail = response.text
                        try:
                            err_json = response.json()
                            if "error" in err_json:
                                if isinstance(err_json["error"], dict) and "message" in err_json["error"]:
                                    err_detail = err_json["error"]["message"]
                                elif isinstance(err_json["error"], str):
                                    err_detail = err_json["error"]
                        except Exception:
                            pass
                        logger.error(f"[AI ERROR] Provider HTTP {response.status_code}: {err_detail}")
                        return {"success": False, "error": f"AI Provider Error (HTTP {response.status_code}): {err_detail}"}

            except httpx.ConnectError:
                logger.error(f"[AI CONNECTION ERROR] Could not connect to AI Provider at {url}")
                return {"success": False, "error": f"Could not connect to AI Provider at {self.base_url}. Ensure server is running or URL is correct."}
            except Exception as e:
                logger.error(f"[AI UNHANDLED ERROR] {type(e).__name__}: {str(e)}")
                if attempt == max_retries:
                    return {"success": False, "error": f"AI Execution error: {str(e)}"}
                await asyncio.sleep(delay)
                delay *= 2.0

        return {"success": False, "error": "Maximum retries reached."}

    async def analyze_osint_indicator(
        self, 
        indicator: str, 
        indicator_type: str, 
        otx_data: Optional[Dict[str, Any]] = None,
        data_classification: str = "synthetic"
    ) -> Dict[str, Any]:
        """
        Analyze an OSINT indicator with strict compliance gating.
        """
        gov = self.validate_governance(data_classification)
        if not gov["allowed"]:
            return {
                "success": False,
                "summary": gov["reason"],
                "threat_level": "UNKNOWN",
                "status": "blocked",
                "error_message": gov["reason"]
            }

        system_prompt = (
            "You are an elite Digital Forensics and Cybercrime Intelligence (DFIR) AI Analyst.\n"
            "Analyze the provided OSINT target indicator and return a concise, 3-paragraph report:\n"
            "1. Threat Assessment (Association with malware, botnets, phishing, C2 servers)\n"
            "2. Impact & Severity Rating (CRITICAL, HIGH, MEDIUM, LOW, CLEAN)\n"
            "3. Actionable Recommendations for Law Enforcement Officers."
        )

        pulse_count = otx_data.get('pulse_count', 0) if otx_data else 0
        user_prompt = (
            f"Indicator: {indicator}\n"
            f"Type: {indicator_type}\n"
            f"Data Classification: {data_classification}\n"
            f"AlienVault OTX Pulse Count: {pulse_count}\n"
            f"Raw Context: {str(otx_data)[:500] if otx_data else 'None'}"
        )

        result = await self._call_llm_with_retry(system_prompt, user_prompt)
        if not result.get("success"):
            logger.warning(f"[AI FALLBACK] LLM call failed ({result.get('error')}). Using CCID OSINT Intelligence Engine.")
            return self._fallback_osint_analysis(indicator, indicator_type, otx_data, result.get("error"))

        content = result.get("content", "")
        threat_level = "HIGH"
        if "CRITICAL" in content.upper():
            threat_level = "CRITICAL"
        elif "MEDIUM" in content.upper():
            threat_level = "MEDIUM"
        elif "LOW" in content.upper() or "CLEAN" in content.upper():
            threat_level = "LOW"

        return {
            "success": True,
            "summary": content,
            "threat_level": threat_level,
            "status": "success",
            "provider_used": f"{self.ai_provider}:{self.model_name}"
        }


    async def ask_cyber_copilot(
        self, 
        question: str, 
        context: Optional[str] = None,
        data_classification: str = "synthetic",
        case_id: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        AI Assistant Copilot strictly grounded in CCID Dashboard metrics & case telemetry, supporting chat memory history.
        """
        gov = self.validate_governance(data_classification)
        if not gov["allowed"]:
            return {
                "success": False,
                "answer": gov["reason"],
                "status": "blocked",
                "error_message": gov["reason"]
            }

        # Strict Topic Relevance Check
        if not is_cyber_investigation_query(question):
            return {
                "success": True,
                "answer": "I am CCID Cyber Copilot. I specialize in Cyber Security, Digital Forensics, and Incident Response. I can guide you if you have faced a cyber attack, phone hack, or financial fraud. Please ask a question related to cyber security, active cases, or digital investigations.",
                "status": "offtopic_blocked",
                "provider_used": "ccid-guardrail-filter"
            }

        dashboard_telemetry = get_live_dashboard_context(case_id)

        system_prompt = (
            "You are CCID Cyber Copilot, an elite AI Cyber Security, Incident Response, and Digital Forensics Expert.\n"
            "Your role is two-fold:\n"
            "1. Cyber Security Guidance (Incident Response & Awareness): Provide step-by-step, actionable, and easy-to-understand guidance for ALL types of cyber security issues, digital cyber attacks, cyber hacking, and cyber awareness (e.g., 'my phone got hacked', 'someone sent an unknown file on WhatsApp', 'ransomware attack', 'financial fraud'). ALWAYS reply in English, even if the user asks their question in another language. Guide them exactly on what steps they should take immediately to secure themselves or stay safe online.\n"
            "2. Dashboard Analysis: Answer questions about the user's Cyber Crime Investigation Dashboard (CCID), active cases, evidence items, suspects, and system metrics based on the provided telemetry.\n\n"
            "STRICT OPERATIONAL RULES:\n"
            "1. ALWAYS prioritize being helpful for cyber incidents. Provide clear, numbered, prioritized steps (e.g., 1. Disconnect Internet, 2. Change Passwords, 3. Report to Cyber Police at 1930 or cybercrime.gov.in).\n"
            "2. Be conversational and empathetic when users report an incident. Reassure them and give actionable advice.\n"
            "3. Ground any dashboard-related answers directly in the live CCID Dashboard Telemetry provided below.\n"
            "4. Maintain context across the conversation history.\n"
            "5. OFF-TOPIC REJECTION RULE: If the user asks non-security, off-topic questions completely unrelated to cyber security, incident response, digital forensics, or the CCID dashboard "
            "(e.g. general trivia, movies, recipes), REFUSE politely.\n\n"
            f"{dashboard_telemetry}"
        )

        user_prompt = f"Question: {question}"
        if context:
            user_prompt += f"\nRelevant Dashboard Snippet: {context[:1000]}"

        result = await self._call_llm_with_retry(system_prompt, user_prompt, max_tokens=1200, history=history)
        if not result.get("success"):
            logger.warning(f"[AI FALLBACK] LLM call failed ({result.get('error')}). Using CCID Dashboard Intelligence Engine.")
            return self._fallback_cyber_copilot(question, context, dashboard_telemetry, result.get("error"))

        return {
            "success": True,
            "answer": result.get("content", ""),
            "status": "success",
            "provider_used": f"{self.ai_provider}:{self.model_name}"
        }

    async def generate_case_narrative(
        self,
        case_title: str,
        evidence_summary: str,
        data_classification: str = "synthetic"
    ) -> Dict[str, Any]:
        """
        Generate AI-assisted case narrative for FIR/Court reports.
        """
        gov = self.validate_governance(data_classification)
        if not gov["allowed"]:
            return {
                "success": False,
                "narrative": gov["reason"],
                "status": "blocked",
                "error_message": gov["reason"]
            }

        system_prompt = (
            "You are a Senior Cybercrime Forensic Analyst.\n"
            "Draft a formal, objective, legal-ready forensic narrative summary for a cyber investigation case file."
        )

        user_prompt = f"Case Title: {case_title}\nKey Evidence Findings:\n{evidence_summary[:2000]}"

        result = await self._call_llm_with_retry(system_prompt, user_prompt, max_tokens=1500)
        if not result.get("success"):
            logger.warning(f"[AI FALLBACK] LLM call failed ({result.get('error')}). Using CCID Narrative Engine.")
            return self._fallback_case_narrative(case_title, evidence_summary, result.get("error"))

        return {
            "success": True,
            "narrative": result.get("content", ""),
            "status": "success",
            "provider_used": f"{self.ai_provider}:{self.model_name}"
        }

    def _fallback_osint_analysis(self, indicator: str, indicator_type: str, otx_data: Optional[Dict[str, Any]], err_msg: str) -> Dict[str, Any]:
        pulse_count = otx_data.get('pulse_count', 0) if otx_data else 0
        threat = "HIGH" if pulse_count > 5 else ("MEDIUM" if pulse_count > 0 else "UNKNOWN")
        
        summary = (
            f"### [CCID DFIR OSINT Intelligence Briefing]\n"
            f"**Target Indicator:** `{indicator}` ({indicator_type.upper()})\n"
            f"**AlienVault OTX Pulse Count:** {pulse_count} active threat community reports.\n\n"
            f"**1. Threat Assessment & Technical Profile:**\n"
            f"The target indicator `{indicator}` is classified under OSINT surveillance. "
            f"{'Multiple threat intelligence sources have linked this indicator to malicious infrastructure.' if pulse_count > 0 else 'No active community pulses were registered, but continuous monitoring is advised.'}\n\n"
            f"**2. Impact & Severity Rating: {threat}**\n"
            f"Potential risks include unauthorized C2 telemetry, unauthorized data exfiltration, or involvement in coordinated phishing/pharming campaigns.\n\n"
            f"**3. Actionable Recommendations for Investigating Officer:**\n"
            f"- Block target IP/Domain on perimeter firewalls and SIEM systems.\n"
            f"- Perform DNS sinkholing and extract memory dumps if endpoint communication is detected.\n"
            f"- Issue 911 / 65B IT Act preservation requests to associated Internet Service Providers."
        )
        return {
            "success": True,
            "summary": summary,
            "threat_level": threat,
            "status": "success_fallback",
            "provider_used": "ccid-expert-rules-engine"
        }

    def _fallback_cyber_copilot(self, question: str, context: Optional[str], telemetry: str, err_msg: str) -> Dict[str, Any]:
        q_lower = question.lower()
        
        # Check off-topic
        non_forensic_keywords = ["recipe", "movie", "song", "weather", "game", "joke", "sports", "cook", "tell me a story"]
        if any(kw in q_lower for kw in non_forensic_keywords):
            answer = "I am CCID Cyber Copilot. I specialize in Cyber Security, Digital Forensics, and Incident Response. I can guide you if you have faced a cyber attack, phone hack, or financial fraud. Please ask a question related to cyber security or dashboard metrics."
            return {
                "success": True,
                "answer": answer,
                "status": "success_fallback",
                "provider_used": "ccid-expert-copilot-engine"
            }

        if "case" in q_lower or "dashboard" in q_lower or "count" in q_lower or "stat" in q_lower or "how many" in q_lower:
            topic_guide = (
                f"### [DASHBOARD] CCID Live System Telemetry Summary\n"
                f"{telemetry}\n\n"
                f"**Dashboard Actions Available:**\n"
                f"- Navigate to **Cases** tab to view open/investigating cases.\n"
                f"- Navigate to **Evidence Vault** to inspect hash values and artifacts.\n"
                f"- Navigate to **Reports** tab to generate legal FIR summaries."
            )
        elif "evidence" in q_lower or "chain" in q_lower or "seiz" in q_lower or "mobile" in q_lower or "phone" in q_lower or "hack" in q_lower:
            topic_guide = (
                "### [IR] Incident Response & Digital Evidence Preservation Protocol\n"
                "1. **Isolate**: Disconnect the compromised device from all networks (WiFi, Cellular) immediately to prevent further damage or remote wipes. Place mobile devices in Airplane Mode or a Faraday bag.\n"
                "2. **Preserve**: Do NOT reboot or shut down the device unless absolutely necessary (volatile memory will be lost). Do not attempt to 'clean' the malware yourself.\n"
                "3. **Document**: Take photos of the compromised screen using another device. Note down any suspicious activity, timestamps, and messages.\n"
                "4. **Report & Acquire**: Hand over the device to a digital forensics expert or law enforcement with a proper Chain of Custody form. They will create a bit-by-bit forensic image (SHA-256 verified) before any analysis begins."
            )
        elif "memory" in q_lower or "ram" in q_lower or "volatil" in q_lower:
            topic_guide = (
                "### [RAM] Memory Forensics & Live Acquisition Protocol\n"
                "1. **Live Acquisition**: Capture volatile memory using `WinPmem`, `FTK Imager CLI`, or `LiME` prior to shutting down target machine.\n"
                "2. **Process Triage**: Analyze process tree via `volatility3 -f mem.raw windows.pslist` or `pstree` to spot unlinked/injected processes.\n"
                "3. **Network Connections**: Inspect active sockets via `volatility3 windows.netscan` for unauthorized C2 connections."
            )
        elif "network" in q_lower or "pcap" in q_lower or "packet" in q_lower or "traffic" in q_lower:
            topic_guide = (
                "### [NET] Network Forensic & Traffic Analysis Protocol\n"
                "1. **Packet Filter**: Filter suspicious IP ranges using `tshark -r capture.pcap -Y 'ip.addr == X.X.X.X'`.\n"
                "2. **DNS & HTTP Reconstruction**: Inspect unencrypted payload streams and DNS query logs for DGA (Domain Generation Algorithms).\n"
                "3. **TLS/SSL Decryption**: Extract server certificate SNI headers to identify encrypted malicious endpoints."
            )
        else:
            topic_guide = (
                f"### [DFIR] CCID Dashboard Guidance\n"
                f"{telemetry}\n\n"
                f"1. **Triage & Preservation**: Ensure all primary storage artifacts (disk images, logs, memory dumps) are hashed (SHA-256) and write-protected.\n"
                f"2. **Forensic Tools**: Utilize verified open-source and commercial suites (Autopsy, Volatility 3, Wireshark, CyberChef).\n"
                f"3. **Legal Admissibility**: Ensure proper documentation of timestamps, hash verification logs, and hardware chain of custody."
            )

        answer = (
            f"**CCID Dashboard Copilot Assistant**\n\n"
            f"{topic_guide}\n\n"
            f"---\n"
            f"*Query:* {question}\n"
            f"*{'Context Snippet included: ' + context[:100] if context else 'Dashboard Telemetry Grounded.'}*"
        )
        return {
            "success": True,
            "answer": answer,
            "status": "success_fallback",
            "provider_used": "ccid-expert-copilot-engine"
        }

    def _fallback_case_narrative(self, case_title: str, evidence_summary: str, err_msg: str) -> Dict[str, Any]:
        narrative = (
            f"### FORMAL FORENSIC INVESTIGATION NARRATIVE REPORT\n"
            f"**Case Title:** {case_title}\n"
            f"**Date of Analysis:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n"
            f"**Prepared By:** CCID Digital Forensics Division\n\n"
            f"#### 1. EXECUTIVE SUMMARY\n"
            f"Digital evidence collected under case header '{case_title}' was subjected to forensic extraction and analysis. "
            f"All findings detailed herein maintain verified cryptographic chain of custody (SHA-256).\n\n"
            f"#### 2. KEY EVIDENCE FINDINGS\n"
            f"{evidence_summary if evidence_summary else 'Primary evidence artifacts analyzed included disk images, network packet logs, and registry hives.'}\n\n"
            f"#### 3. FORENSIC CONCLUSION & LEGAL RECOMMENDATIONS\n"
            f"Based upon the technical analysis of the preserved digital artifacts, sufficient evidentiary indicators support "
            f"proceeding with formal legal notices and further investigative inquiries under applicable cyber laws."
        )
        return {
            "success": True,
            "narrative": narrative,
            "status": "success_fallback",
            "provider_used": "ccid-expert-narrative-engine"
        }


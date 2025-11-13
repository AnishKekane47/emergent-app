import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        self.sender_email = os.getenv('SENDER_EMAIL', 'alerts@frauddetection.com')
        self.mock_mode = not self.sendgrid_api_key or self.sendgrid_api_key == 'your_sendgrid_api_key_here'
        
        if self.mock_mode:
            logger.info("Email service running in MOCK mode - emails will be logged but not sent")
        else:
            logger.info("Email service initialized with SendGrid")

    async def send_fraud_alert(self, alert_data: dict, recipient_email: str) -> bool:
        """Send fraud alert email"""
        subject = f"🚨 Fraud Alert: {alert_data.get('risk_level')} Risk Detected"
        
        html_content = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                    .alert-box {{ background: #fff3cd; border-left: 4px solid #ff6b6b; padding: 20px; margin: 20px 0; }}
                    .critical {{ border-left-color: #dc3545; background: #f8d7da; }}
                    .high {{ border-left-color: #ff6b6b; background: #fff3cd; }}
                    .medium {{ border-left-color: #ffc107; background: #fff8e1; }}
                    .detail {{ margin: 10px 0; }}
                    .label {{ font-weight: bold; color: #333; }}
                    .score {{ font-size: 24px; font-weight: bold; color: #dc3545; }}
                </style>
            </head>
            <body>
                <h2>Fraud Detection Alert</h2>
                <div class="alert-box {alert_data.get('risk_level', 'medium').lower()}">
                    <h3>Risk Level: {alert_data.get('risk_level', 'UNKNOWN')}</h3>
                    <p class="score">Fraud Score: {alert_data.get('total_score', 0):.2f}</p>
                </div>
                
                <h3>Transaction Details</h3>
                <div class="detail">
                    <span class="label">Transaction ID:</span> {alert_data.get('transaction_id', 'N/A')}
                </div>
                <div class="detail">
                    <span class="label">Amount:</span> ${alert_data.get('amount', 0):.2f}
                </div>
                <div class="detail">
                    <span class="label">Merchant:</span> {alert_data.get('merchant', 'N/A')}
                </div>
                <div class="detail">
                    <span class="label">Location:</span> {alert_data.get('location', 'N/A')}
                </div>
                <div class="detail">
                    <span class="label">User ID:</span> {alert_data.get('user_id', 'N/A')}
                </div>
                
                <h3>Detection Details</h3>
                <div class="detail">
                    <span class="label">Rule Score:</span> {alert_data.get('rule_score', 0):.2f}
                </div>
                <div class="detail">
                    <span class="label">AI Score:</span> {alert_data.get('ai_score', 0):.2f}
                </div>
                <div class="detail">
                    <span class="label">Violated Rules:</span> {', '.join(alert_data.get('violated_rules', [])) or 'None'}
                </div>
                
                <p style="margin-top: 20px; color: #666;">
                    <em>This is an automated alert from the Fraud Detection System. Please review immediately.</em>
                </p>
            </body>
        </html>
        """
        
        if self.mock_mode:
            logger.info(f"[MOCK EMAIL] To: {recipient_email}")
            logger.info(f"[MOCK EMAIL] Subject: {subject}")
            logger.info(f"[MOCK EMAIL] Alert ID: {alert_data.get('alert_id')}")
            logger.info(f"[MOCK EMAIL] Risk Level: {alert_data.get('risk_level')}")
            logger.info(f"[MOCK EMAIL] Score: {alert_data.get('total_score')}")
            return True
        
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            
            message = Mail(
                from_email=self.sender_email,
                to_emails=recipient_email,
                subject=subject,
                html_content=html_content
            )
            
            sg = SendGridAPIClient(self.sendgrid_api_key)
            response = sg.send(message)
            
            return response.status_code == 202
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
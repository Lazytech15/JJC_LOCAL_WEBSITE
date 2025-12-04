// ============================================================================
// services/email-service.js - Dynamic Email Service with Config Management
// ============================================================================
import { BaseAPIService } from "../core/base-api.js";

export class EmailService extends BaseAPIService {
  // ==================== EMAIL SENDING ====================
  
  /**
   * Send single email
   * @param {Object} emailData - Email data
   * @param {number|null} configId - Optional config ID (null = use default)
   */
  async sendEmail(emailData, configId = null) {
    try {
      const payload = { ...emailData };
      if (configId) {
        payload.config_id = configId;
      }

      return await this.request("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("[EmailService] Send email error:", error);
      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(emailsArray, configId = null) {
    try {
      const payload = { emails: emailsArray };
      if (configId) {
        payload.config_id = configId;
      }

      return await this.request("/api/email/send-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("[EmailService] Send bulk emails error:", error);
      throw error;
    }
  }

  // ==================== EMAIL CONFIGURATIONS ====================
  
  /**
   * Get all email configurations
   */
  async getConfigs() {
    try {
      return await this.request("/api/email/configs", {
        method: "GET",
      });
    } catch (error) {
      console.error("[EmailService] Get configs error:", error);
      throw error;
    }
  }

  /**
   * Get default email configuration
   */
  async getDefaultConfig() {
    try {
      return await this.request("/api/email/configs/default", {
        method: "GET",
      });
    } catch (error) {
      console.error("[EmailService] Get default config error:", error);
      throw error;
    }
  }

  /**
   * Get specific email configuration
   */
  async getConfig(configId) {
    try {
      return await this.request(`/api/email/configs/${configId}`, {
        method: "GET",
      });
    } catch (error) {
      console.error("[EmailService] Get config error:", error);
      throw error;
    }
  }

  /**
   * Create new email configuration
   */
  async createConfig(configData) {
    try {
      return await this.request("/api/email/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configData),
      });
    } catch (error) {
      console.error("[EmailService] Create config error:", error);
      throw error;
    }
  }

  /**
   * Update email configuration
   */
  async updateConfig(configId, updates) {
    try {
      return await this.request(`/api/email/configs/${configId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error("[EmailService] Update config error:", error);
      throw error;
    }
  }

  /**
   * Delete email configuration
   */
  async deleteConfig(configId) {
    try {
      return await this.request(`/api/email/configs/${configId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("[EmailService] Delete config error:", error);
      throw error;
    }
  }

  /**
   * Test email configuration
   */
  async testConfig(configId = null) {
    try {
      const endpoint = configId 
        ? `/api/email/test-connection?config_id=${configId}`
        : "/api/email/test-connection";

      return await this.request(endpoint, {
        method: "GET",
      });
    } catch (error) {
      console.error("[EmailService] Test config error:", error);
      throw error;
    }
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Send email to specific employee
   */
  async sendToEmployee(employeeId, subject, body, options = {}) {
    try {
      const employeeData = await this.request(`/api/employees/${employeeId}`, {
        method: "GET",
      });

      const employeeEmail = employeeData.data?.email;

      if (!employeeEmail) {
        throw new Error("Employee email not found");
      }

      return await this.sendEmail({
        to: employeeEmail,
        subject,
        body,
        ...options,
      }, options.config_id);
    } catch (error) {
      console.error("[EmailService] Send to employee error:", error);
      throw error;
    }
  }

  /**
   * Send email to multiple employees
   */
  async sendToEmployees(employeeIds, subject, body, options = {}) {
    try {
      const employeePromises = employeeIds.map((id) =>
        this.request(`/api/employees/${id}`, { method: "GET" })
      );

      const employeeResults = await Promise.all(employeePromises);
      const employeeEmails = employeeResults
        .map((result) => result.data?.email)
        .filter(Boolean);

      if (employeeEmails.length === 0) {
        throw new Error("No valid employee emails found");
      }

      return await this.sendEmail({
        to: employeeEmails,
        subject,
        body,
        ...options,
      }, options.config_id);
    } catch (error) {
      console.error("[EmailService] Send to employees error:", error);
      throw error;
    }
  }

  /**
   * Send email to department
   */
  async sendToDepartment(departmentId, subject, body, options = {}) {
    try {
      const data = await this.request(
        `/api/employees?department_id=${departmentId}`,
        { method: "GET" }
      );

      const employeeEmails = data.data
        .map((emp) => emp.email)
        .filter(Boolean);

      if (employeeEmails.length === 0) {
        throw new Error("No employees found in department");
      }

      return await this.sendEmail({
        to: employeeEmails,
        subject,
        body,
        ...options,
      }, options.config_id);
    } catch (error) {
      console.error("[EmailService] Send to department error:", error);
      throw error;
    }
  }

  // ==================== TEMPLATES ====================

  /**
   * Get email templates
   */
  async getTemplates() {
    try {
      return await this.request("/api/email/templates", {
        method: "GET",
      });
    } catch (error) {
      console.error("[EmailService] Get templates error:", error);
      throw error;
    }
  }

  /**
   * Parse template with variables
   */
  parseTemplate(template, variables) {
    let parsed = template;

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      parsed = parsed.replace(regex, variables[key]);
    });

    return parsed;
  }

  /**
   * Send templated email
   */
  async sendTemplatedEmail(templateSlug, to, variables, options = {}) {
    try {
      const templatesData = await this.getTemplates();
      const template = templatesData.templates.find(
        (t) => t.slug === templateSlug
      );

      if (!template) {
        throw new Error(`Template '${templateSlug}' not found`);
      }

      const subject = this.parseTemplate(template.subject, variables);
      const body = this.parseTemplate(template.body, variables);

      return await this.sendEmail({
        to,
        subject,
        body,
        isHtml: true,
        ...options,
      }, options.config_id);
    } catch (error) {
      console.error("[EmailService] Send templated email error:", error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Create styled email with consistent branding
   */
  createStyledEmail(to, subject, content, options = {}) {
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">${options.headerTitle || subject}</h1>
          </div>
          <div style="padding: 40px 30px; background-color: #ffffff;">
            ${content}
          </div>
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
              ${options.footerText || "This is an automated message. Please do not reply."}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">
              &copy; ${new Date().getFullYear()} ${options.companyName || "Your Company"}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to,
      subject,
      body: htmlBody,
      isHtml: true,
      ...options,
    };
  }
}
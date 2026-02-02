import db
from globals import client
def publish_home(user_id, view):
	client.views_publish(user_id=user_id, view=view)

def not_user():
	shipwrights = db.get_shipwrights()
	shipwright_list = ""
	for shipwrights in enumerate(shipwrights):
		shipwright_list += f" <@{shipwrights[1]}>, "

	return {
	"type": "home",
	"blocks": [
		{
			"type": "header",
			"text": {
				"type": "plain_text",
				"text": "Shipwrights Home!",
				"emoji": True
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Hey there, It looks like you aren't a shipwright so here's some fun stats to look at!"
			}
		},
		{
			"type": "divider"
		},
		{
			"type": "divider"
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "*Ships*"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": f"Projects Shipped Today: {db.shipped_projects('day')}\nProjects Shipped This Week: {db.shipped_projects('week')}\nProjects Shipped This Month: {db.shipped_projects('month')}\n Total Projects Shipped {db.shipped_projects('all')}"
			}
		},
		{
			"type": "divider"
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "*Tickets*"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": f"Tickets Closed: {db.count_tickets('closed')}\nTickets Open: {db.count_tickets('open')}\nAvg Time Taken: {db.avg_close_time('all')}"
			}
		},
		{
			"type": "divider"
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "*The Team*"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": f"{shipwright_list} <https://shipwrights.eryxks.dev/|Way better view.>"
			}
		},
		{
			"type": "divider"
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "*Contact Us*"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Please create a ticket in <#C099P9FQQ91>."
			}
		}
	]
}
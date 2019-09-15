#!/bin/sh

sudo cp ./oled.service /etc/systemd/system/oled.service
sudo systemctl daemon-reload
sudo systemctl enable oled
sudo systemctl restart oled
sudo systemctl status oled

